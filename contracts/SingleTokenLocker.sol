pragma solidity ^0.4.13;
import "./Interfaces/IERC20Token.sol";
import "./Utils/Owned.sol";
import "./Utils/SafeMath.sol";
import "./Utils/ReentrancyHandler.sol";
import "./Utils/StandardContract.sol";

/*
 * A SingleTokenLocker allows a user to create a locker that can lock a single type of ERC20 token.
 * The token locker should:
 *    - Allow the owner to prove a certain number of their own tokens are locked for until a particular time
 *    - Allow the owner to transfer tokens to a recipient and prove the tokens are locked until a particular time
 *    - Allow the owner to cancel a transfer before a recipient confirms (in case of transfer to an incorrect address)
 *    - Allow the recipient to be certain that they will have access to transferred tokens once the lock expires
 *    - Be re-usable by the owner, so an owner can easily schedule/monitor multiple transfers/locks
 *
 * This class should be reusable for any ERC20 token.  Ideally, this sort of fine grained locking would be available in
 * the token contract itself.  Short of that, the token locker receives tokens (presumably from the locker owner) and
 * can be configured to release them only under certain conditions.
 *
 * Usage:
 *  - The owner creates a token locker for a particular ERC20 token type
 *  - The owner transfers tokens to the locker.  These tokens will not be locked and can be removed at any time
 *  - The owner calls "lockup" with a particular recipient, amount, and unlock time.  The recipient will be allowed
 *    to collect the tokens once the lockup period is ended.
 *  - The recipient calls "confirm" which confirms that the recipient's address is correct and is controlled by the
 *    intended recipient (e.g. not an exchange address).  The assumption is that if the recipient can call "confirm"
 *    they have demonstrated that they will also be able to call "collect" when the tokens are ready.
 *  - Once the lock expires, the recipient calls "collect" and the tokens are transferred from the locker to the
 *    recipient.
 *
 * An owner can lockup his/her own tokens in order to demonstrate the they will not be moved until a particular time.
 * In this case, no separate "confirm" step is needed (confirm happens automatically)
 */
contract SingleTokenLocker is Owned, ReentrancyHandler, StandardContract {

  using SafeMath for uint256;

  // the type of token this locker is used for
  IERC20Token public token;

  // A counter to generate unique Ids for promises
  uint256 public nextPromiseId;

  // promise storage
  mapping(uint256 => TokenPromise) public promises;

  // The total amount of tokens locked or pending lock (in the non-fractional units, like wei)
  uint256 public promisedTokenBalance;

  // The total amount of tokens actually locked (recipients have confirmed)
  uint256 public lockedTokenBalance;

  //        +-------------------------------------------------------------+
  //        |                      Actual Locker Balance                  |
  //        |-------------------------------------------------------------|
  //        |                     |                Promised               |
  // State  |     Uncommitted     |---------------------------------------|
  //        |                     |        Pending       |     Locked     |
  //        |-------------------------------------------------------------|
  // Actions| withdraw            |  confirm, cancel     | collect        |
  //        |---------------------|----------------------|----------------|
  // Field  | balance - promised  | promised - locked    | locked         |
  //        +---------------------|----------------------|----------------+


  // promise states
  //  none: The default state.  Never explicitly assigned.
  //  pending: The owner has initiated a promise, but it has not been claimed
  //  confirmed: The recipient has confirmed the promise
  //  executed: The promise has completed (after the required lockup)
  //  canceled: The promise was canceled (only from pending state)
  enum PromiseState { none, pending, confirmed, executed, canceled }

  struct TokenPromise {
    uint256 promiseId;
    address recipient;
    uint256 amount;
    uint256 lockedUntil;
    PromiseState state;
  }

  event logPromiseCreated(uint256 promiseId, address recipient, uint256 amount, uint256 lockedUntil);
  event logPromiseConfirmed(uint256 promiseId);
  event logPromiseCanceled(uint256 promiseId);
  event logPromiseFulfilled(uint256 promiseId);

  modifier onlyRecipient(uint256 promiseId) {
    TokenPromise storage promise = promises[promiseId];
    require(promise.recipient == msg.sender);
    _;
  }

  modifier promiseExists(uint promiseId) {
    TokenPromise storage promise = promises[promiseId];
    require(promise.recipient != 0);
    _;
  }

  modifier hasUncommittedTokens(uint256 tokens) {
    require(tokens <= uncommittedTokenBalance());
    _;
  }

  modifier thenAssertState() {
    _;
    uint256 balance = tokenBalance();
    assert(lockedTokenBalance <= promisedTokenBalance);
    assert(promisedTokenBalance <= balance);
  }

  // Constructor
  function SingleTokenLocker(address tokenAddress) {
    token = IERC20Token(tokenAddress);
  }

  /**
   * Initiates the request to lockup the given number of tokens until the given block.timestamp occurs.
   * This contract will attempt to acquire tokens from the Token contract from the owner if its balance
   * is not sufficient.  Therefore, the locker owner may call token.approve(locker.address, amount) one time
   * and then initiate many smaller transfers to individuals.
   *
   * Note 1: lockup is not guaranteed until the recipient confirms.
   * Note 2: Assumes the owner has already given approval for the TokenLocker to take out the tokens
   */
  function lockup(address recipient, uint256 amount, uint256 lockedUntil)
    onlyOwner
    notNull(recipient)
    notZero(amount)
    noReentrancy
    external
  {
    // if the locker does not have sufficient unlocked tokens, assume it has enough
    // approved by the owner to make up the difference
    ensureTokensAvailable(amount);

    // setup a promise that allow transfer to the recipient after the lock expires
    TokenPromise storage promise = createPromise(recipient, amount, lockedUntil);

    // auto-confirm if the recipient is the owner
    if (recipient == owner) {
      doConfirm(promise);
    }
  }

  /***
   * Cancels the pending transaction as long as the caller has permissions and the transaction has not already
   * been confirmed.  Allowing *any* transaction to be canceled would mean no lockup could ever be guaranteed.
   */
  function cancel(uint256 promiseId)
    promiseExists(promiseId)
    requires(promises[promiseId].state == PromiseState.pending)
    requiresOne(
      msg.sender == owner,
      msg.sender == promises[promiseId].recipient
    )
    noReentrancy
    external
  {
    fulfillPromise(promiseId, false);
  }

  /***
   * Called by the recipient after the lock as expired.
   */
  function collect(uint256 promiseId)
    promiseExists(promiseId)
    onlyRecipient(promiseId)
    requires(block.timestamp >= promises[promiseId].lockedUntil)
    requires(promises[promiseId].state != PromiseState.canceled)
    requires(promises[promiseId].state != PromiseState.executed)
    noReentrancy
    external
  {
    fulfillPromise(promiseId, true);
  }

  // Allows the recipient to confirm their address.  If this fails (or they cannot send from the specified address)
  // the owner of the TokenLocker can cancel the promise and initiate a new one
  function confirm(uint256 promiseId)
    promiseExists(promiseId)
    onlyRecipient(promiseId)
    requires(promises[promiseId].state == PromiseState.pending)
    noReentrancy
    external
  {
    doConfirm(promises[promiseId]);
    assert(promises[promiseId].state == PromiseState.confirmed);
  }

  function withdrawUncommittedTokens(uint _amount)
    onlyOwner
    requires(_amount <= uncommittedTokenBalance())
  {
    require(token.transfer(owner, _amount));
  }

  function withdrawAllUncommittedTokens()
    onlyOwner
    noReentrancy
    external
  {
    withdrawUncommittedTokens(uncommittedTokenBalance());
  }

  function isConfirmed(uint256 promiseId)
    constant
    returns(bool)
  {
    return promises[promiseId].state == PromiseState.confirmed;
  }

  // Returns total number of transactions after filers are applied.
  function getTransactionCount(address recipient, bool pending, bool confirmed, bool executed)
    public
    constant
    returns (uint count)
  {
    for (uint i=0; i<nextPromiseId; i++) {
      if (recipient != 0x0 && recipient != promises[i].recipient)
        continue;

      if (   pending && promises[i].state == PromiseState.pending
          || confirmed && promises[i].state == PromiseState.confirmed
          || executed && promises[i].state == PromiseState.executed)
      count += 1;
    }
  }

  // Returns list of transaction IDs in defined range.
  function getPromiseIds(uint from, uint to, address recipient, bool pending, bool confirmed, bool executed)
    public
    constant
    returns (uint[] _promiseIds)
  {
    uint[] memory promiseIdsTemp = new uint[](nextPromiseId);
    uint count = 0;
    uint i;
    for (i=0; i<nextPromiseId && count < to; i++)
    {
      if (recipient != 0x0 && recipient != promises[i].recipient)
        continue;

      if (   pending && promises[i].state == PromiseState.pending
          || executed && promises[i].state == PromiseState.executed
          || confirmed && promises[i].state == PromiseState.confirmed)
      {
        promiseIdsTemp[count] = i;
        count += 1;
      }
    }
    _promiseIds = new uint[](to - from);
    for (i=from; i<to; i++)
      _promiseIds[i - from] = promiseIdsTemp[i];
  }



  // tokens can be transferred out by the owner if either
  //  1: The tokens are not the type that are governed by this contract (accidentally sent here, most likely)
  //  2: The tokens are not already promised to a recipient (either pending or confirmed)
  //
  // If neither of these conditions are true, then allowing the owner to transfer the tokens
  // out would violate the purpose of the token locker, which is to prove that the tokens
  // cannot be moved.
  function salvageTokensFromContract(address _tokenAddress, address _to, uint _amount)
    onlyOwner
    requiresOne(
      _tokenAddress != address(token),
      _amount <= uncommittedTokenBalance()
    )
    noReentrancy
    external
  {
    IERC20Token(_tokenAddress).transfer(_to, _amount);
  }

  function tokenBalance()
    constant
    returns(uint256)
  {
    return token.balanceOf(address(this));
  }

  function uncommittedTokenBalance()
    constant
    returns(uint256)
  {
    return tokenBalance() - promisedTokenBalance;
  }

  function pendingTokenBalance()
    constant
    returns(uint256)
  {
    return promisedTokenBalance - lockedTokenBalance;
  }

  // ------------------ internal methods ------------------ //
  function doConfirm(TokenPromise storage promise)
    thenAssertState
    internal
  {
    promise.state = PromiseState.confirmed;
    lockedTokenBalance = lockedTokenBalance.add(promise.amount);
    logPromiseConfirmed(promise.promiseId);
  }

  // creates and stores a new promise object, updated the totalLockedTokens amount
  function createPromise(address recipient, uint256 amount, uint256 lockedUntil)
    hasUncommittedTokens(amount)
    thenAssertState
    internal
    returns(TokenPromise storage promise)
  {
    uint256 promiseId = nextPromiseId++;
    promise = promises[promiseId];
    promise.promiseId = promiseId;
    promise.recipient = recipient;
    promise.amount = amount;
    promise.lockedUntil = lockedUntil;
    promise.state = PromiseState.pending;

    promisedTokenBalance = promisedTokenBalance.add(promise.amount);

    logPromiseCreated(promiseId, recipient, amount, lockedUntil);

    return promise;
  }

  function fulfillPromise(uint256 promiseId, bool execute)
    thenAssertState
    internal
  {
    TokenPromise storage promise = promises[promiseId];
    promisedTokenBalance = promisedTokenBalance.sub(promise.amount);

    address finalRecipient;
    if (execute) {
      if (promise.state == PromiseState.confirmed) {
        lockedTokenBalance = lockedTokenBalance.sub(promise.amount);
      }
      promise.state = PromiseState.executed;
      finalRecipient = promise.recipient;

      logPromiseFulfilled(promise.promiseId);

    }
    else { // cancel
      assert(promise.state == PromiseState.pending);
      promise.state = PromiseState.canceled;
      finalRecipient = owner;

      logPromiseCanceled(promise.promiseId);
    }

    require(token.transfer(finalRecipient, promise.amount));
  }

  function ensureTokensAvailable(uint256 amount)
    onlyOwner
    internal
  {
    uint256 uncommittedBalance = uncommittedTokenBalance();
    if (uncommittedBalance < amount) {
      token.transferFrom(owner, this, amount.sub(uncommittedBalance));
      assert(uncommittedTokenBalance() >= amount);
    }
  }
}
