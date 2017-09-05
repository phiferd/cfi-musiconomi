var Promise = require("bluebird");
var TokenLocker = artifacts.require("./SingleTokenLocker.sol");
var Token = artifacts.require("./MusiconomiToken.sol");

var Utils = require("./Utils");
const assertInvalidOp = Utils.assertInvalidOp;

const getBlockNumber = Promise.promisify(web3.eth.getBlockNumber);
const getBlock = Promise.promisify(web3.eth.getBlock);

contract('SingleTokenLocker', function () {

  describe("Token Locker Tests", () => {
    let token;
    let tokenLocker;

    let ownerMinter = web3.eth.accounts[0];
    let lockerOwner = web3.eth.accounts[1];
    let recipient1 = web3.eth.accounts[2];
    let recipient2 = web3.eth.accounts[3];
    let otherUser1 = web3.eth.accounts[4];

    let currentTime;
    const initialBalance = 100;
    const lockerAllowance = 50;

    beforeEach(() => {
      return Promise.resolve()
        .then(() => Token.new(ownerMinter, 0))
        .then((_token) => token = _token)
        .then(() => token.mintTokens(lockerOwner, initialBalance, {from: ownerMinter}))

        .then(() => TokenLocker.new(token.address, {from: lockerOwner}))
        .then((_locker) => tokenLocker = _locker)
        .then(() => token.approve(tokenLocker.address, lockerAllowance, {from: lockerOwner}))
    });

    it('can lock tokens', () => {
      const amount = 10;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b))
        .then(b => currentTime = b.timestamp)
        .then(() => lockTokens(tokenLocker, recipient1, amount, currentTime+5))
        .then(Utils.checkNumberField(tokenLocker, "promisedTokenBalance", amount))
        .then(Utils.checkNumberField(tokenLocker, "lockedTokenBalance", 0))

        // can't withdrawn committed tokens
        .then(() => assertInvalidOp(tokenLocker.salvageTokensFromContract(token.address, lockerOwner, 1, {from: lockerOwner})))
        .then(() => assertInvalidOp(tokenLocker.withdrawUncommittedTokens(1, {from: lockerOwner})))
    });

    it('can list promises', () => {
      const amount = 10;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b))
        .then(b => currentTime = b.timestamp)
        .then(() => lockTokens(tokenLocker, recipient1, 1, currentTime+5))
        .then(() => lockTokensAndConfirm(tokenLocker, recipient1, 2, currentTime+6))
        .then(() => lockTokens(tokenLocker, recipient2, 3, currentTime+7))
        .then(() => lockTokensAndConfirm(tokenLocker, recipient2, 4, currentTime+8))

        .then(() => tokenLocker.getTransactionCount(recipient1, true, true, true))
        .then((c) => tokenLocker.getPromiseIds(0, c, recipient1, true, true, true))
        .then(() => tokenLocker.getTransactionCount(recipient2, true, true, true))
        .then((c) => tokenLocker.getPromiseIds(0, c, recipient2, true, true, true))
    });

    it("can't lockup more than it its allowance", () => {
      const amount = lockerAllowance+1;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b))
        .then(b => currentTime = b.timestamp)
        .then(() => assertInvalidOp(lockTokens(tokenLocker, recipient1, amount, currentTime+5)))
    });

    it('allows owner to cancel before confirm', () => {
      const amount = 10;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b)).then(b => currentTime = b.timestamp)
        .then(() => lockTokens(tokenLocker, recipient1, amount, currentTime+5))
        .then(tx => {
          return Promise.resolve()
            .then(Utils.checkNumberField(tokenLocker, "promisedTokenBalance", amount))
            .then(Utils.checkNumberField(tokenLocker, "tokenBalance", amount))

            .then(() => tokenLocker.cancel(tx, {from: lockerOwner}))
            .then(Utils.checkNumberField(tokenLocker, "promisedTokenBalance", 0))
            .then(Utils.checkNumberField(tokenLocker, "tokenBalance", amount))

            .then(() => assertInvalidOp(tokenLocker.confirm(tx, {from: recipient1})))

        })
    });

    it('DOES NOT allow owner to cancel AFTER confirm', () => {
      const amount = 10;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b)).then(b => currentTime = b.timestamp)
        .then(() => lockTokensAndConfirm(tokenLocker, recipient1, amount, currentTime+5))
        .then(tx => {
          return Promise.resolve()
            .then(Utils.checkNumberField(tokenLocker, "promisedTokenBalance", amount))
            .then(() => assertInvalidOp(tokenLocker.cancel(tx, {from: lockerOwner})))
            .then(Utils.checkNumberField(tokenLocker, "promisedTokenBalance", amount))
        })
    });

    it('can withdraw unlocked tokens', () => {
      return Promise.resolve()
        .then(() => tokenLocker.withdrawAllUncommittedTokens({from: lockerOwner}))
        .then(() => token.balanceOf(lockerOwner))
        .then(b => assert.equal(b.toNumber(), initialBalance));
    });

    it('allows recipient to confirm', () => {
      const amountLocked = 10;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b))
        .then(b => currentTime = b.timestamp)
        .then(() => lockTokensAndConfirm(tokenLocker, recipient1, amountLocked, currentTime+50))
        .then(tx => {
          return Promise.resolve()
            .then(Utils.checkNumberField(tokenLocker, "lockedTokenBalance", amountLocked))
            .then(Utils.checkMethod(tokenLocker, "isConfirmed", [tx], true))

            // ensure tokens are actually locked
            .then(() => tokenLocker.withdrawAllUncommittedTokens({from: lockerOwner}))
            .then(() => token.balanceOf(lockerOwner))
            .then(b => assert.equal(b.toNumber(), initialBalance - amountLocked));
        })
    });

    it('auto-confirms promises from locker owner', () => {
      const amountLocked = 10;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b))
        .then(b => currentTime = b.timestamp)
        .then(() => lockTokens(tokenLocker, lockerOwner, amountLocked, currentTime+50))
        .then(tx => {
          return Promise.resolve()
            .then(Utils.checkNumberField(tokenLocker, "lockedTokenBalance", amountLocked))
            .then(Utils.checkMethod(tokenLocker, "isConfirmed", [tx], true))
        })
    });

    it('allows recipient to claim', () => {
      const amountLocked = 10;
      const lockDuration = 4;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b))
        .then(b => currentTime = b.timestamp)
        .then(() => lockTokensAndConfirm(tokenLocker, recipient1, amountLocked, currentTime + lockDuration))
        .then(tx => {
          return Promise.resolve()
            .then(() => assertInvalidOp(tokenLocker.collect(tx, {from: recipient1})))
            .then(() => assertTokenBalance(token, recipient1, 0))

            .then(() => waitUntilTime(currentTime + lockDuration, otherUser1))
            .then(() => assertInvalidOp(tokenLocker.collect(tx, {from: recipient2})))

            .then(() => tokenLocker.collect(tx, {from: recipient1}))
            .then(() => assertTokenBalance(token, recipient1, amountLocked))
        })
    });


    it('handles multiple transfers', () => {
      const amount1 = 11;
      const amount2 = 9;
      const lockDuration1 = 4;
      const lockDuration2 = 2;
      const TRUE = true;
      let tx1, tx2;
      return Promise.resolve()
        .then(() => getBlockNumber()).then(b => getBlock(b)).then(b => currentTime = b.timestamp)

        .then(() => lockTokens(tokenLocker, recipient1, amount1, currentTime + lockDuration1))
        .then(tx => tx1 = tx)
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, TRUE, false, false], 1))
        .then(() => tokenLocker.confirm(tx1, {from: recipient1}))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, TRUE, false, false], 0))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, false, TRUE, false], 1))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [recipient1, false, TRUE, false], 1))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [recipient2, false, TRUE, false], 0))

        .then(() => lockTokensAndConfirm(tokenLocker, recipient2, amount2, currentTime + lockDuration2))
        .then(tx => tx2 = tx)
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, false, TRUE, false], 2))

        .then(Utils.checkNumberField(tokenLocker, "promisedTokenBalance", amount1 + amount2))
        .then(Utils.checkNumberField(tokenLocker, "lockedTokenBalance", amount1 + amount2))

        .then(() => waitUntilTime(currentTime+lockDuration2, otherUser1))
        .then(() => tokenLocker.collect(tx2, {from: recipient2}))
        .then(Utils.checkNumberField(tokenLocker, "promisedTokenBalance", amount1))
        .then(Utils.checkNumberField(tokenLocker, "lockedTokenBalance", amount1))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, false, TRUE, false], 1))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, false, false, TRUE], 1))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, false, TRUE, TRUE], 2))

        .then(() => waitUntilTime(currentTime+lockDuration1, otherUser1))
        .then(() => tokenLocker.collect(tx1, {from: recipient1}))
        .then(Utils.checkNumberField(tokenLocker, "promisedTokenBalance", 0))
        .then(Utils.checkNumberField(tokenLocker, "lockedTokenBalance", 0))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, false, TRUE, false], 0))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, false, false, TRUE], 2))
        .then(Utils.checkNumberMethod(tokenLocker, "getTransactionCount", [0, false, TRUE, TRUE], 2))
    });
  });
});

function assertTokenBalance(token, addr, amount) {
  return token.balanceOf(addr)
    .then(b => assert(b.equals(amount), "Token balance was not as expected"))
}

function lockTokensAndConfirm(locker, recipient, amount, until) {
  return lockTokens(locker, recipient, amount, until)
    .then(id => {
      return locker.confirm(id, {from: recipient})
        .then(() => id)
    })
}

function lockTokens(locker, recipient, amount, until) {
  return Promise.resolve()
    .then(() => locker.owner())
    .then((_owner) => locker.lockup(recipient, amount, until, {from: _owner}))
    .then(() => locker.nextPromiseId())
    .then(id => id.toNumber() - 1)
}

function waitUntilTime(time, dummy) {
  return Promise.resolve()
    .then(() => getBlockNumber())
    .then(_currentBlock => getBlock(_currentBlock))
    .then((_block) => {
      // console.log("Waiting for time " + time + ", at time " + _block.timestamp);
      if (_block.timestamp >= time) {
        return true;
      }
      else {
        return Promise.resolve()
          .then(() => web3.eth.sendTransaction({from: dummy, to: dummy, value: 0, gas: 22000}))
          .then(() => waitUntilTime(time, dummy))
      }
    })
}
