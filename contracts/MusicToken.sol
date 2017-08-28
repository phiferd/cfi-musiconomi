pragma solidity ^0.4.13;

import "./Interfaces/ITokenRecipient.sol";
import "./Interfaces/IERC20Token.sol";
import "./Utils/Owned.sol";
import "./Utils/SafeMath.sol";
import "./Utils/Lockable.sol";

contract MusiconomiToken is IERC20Token, Owned, Lockable{ // TO-DO: Change contract name

  using SafeMath for uint256;

  /* Public variables of the token */
  string public standard = "Musiconomi token v1.0";
  string public name = "Musiconomi";
  string public symbol = "MCI";
  uint8 public decimals = 18;

  address public crowdsaleContractAddress;

  /* Private variables of the token */
  uint256 supply = 100 * 10**18; //TO-DO: Set the right ammount of totalsupply
  mapping (address => uint256) balances;
  mapping (address => mapping (address => uint256)) allowances;

  /* Events */
  event Mint(address indexed _to, uint256 _value);

  /* Initializes contract */
  function MusiconomiToken(address _crowdsaleAddress, uint _tokenStartBlock) { // TO-DO: set block lock
    crowdsaleContractAddress = _crowdsaleAddress;
    lockFromSelf(_tokenStartBlock, "Lock before crowdsale starts");
  }

  /* Returns total supply of issued tokens */
  function totalSupply() constant returns (uint256) {
    return supply;
  }

  /* Returns balance of address */
  function balanceOf(address _owner) constant returns (uint256 balance) {
    return balances[_owner];
  }

  /* Transfers tokens from your address to other */
  function transfer(address _to, uint256 _value) lockAffected returns (bool success) {
    require(_to != 0x0 && _to != address(this));
    balances[msg.sender] = balances[msg.sender].sub(_value); // Deduct senders balance
    balances[_to] = balances[_to].add(_value);               // Add recivers blaance
    Transfer(msg.sender, _to, _value);                       // Raise Transfer event
    return true;
  }

  /* Approve other address to spend tokens on your account */
  function approve(address _spender, uint256 _value) lockAffected returns (bool success) {
    allowances[msg.sender][_spender] = _value;        // Set allowance
    Approval(msg.sender, _spender, _value);           // Raise Approval event
    return true;
  }

  /* Approve and then communicate the approved contract in a single tx */
  function approveAndCall(address _spender, uint256 _value, bytes _extraData) lockAffected returns (bool success) {
    ItokenRecipient spender = ItokenRecipient(_spender);            // Cast spender to tokenRecipient contract
    approve(_spender, _value);                                      // Set approval to contract for _value
    spender.receiveApproval(msg.sender, _value, this, _extraData);  // Raise method on _spender contract
    return true;
  }

  /* A contract attempts to get the coins */
  function transferFrom(address _from, address _to, uint256 _value) lockAffected returns (bool success) {
    require(_to != 0x0 && _to != address(this));
    balances[_from] = balances[_from].sub(_value);                              // Deduct senders balance
    balances[_to] = balances[_to].add(_value);                                  // Add recipient blaance
    allowances[_from][msg.sender] = allowances[_from][msg.sender].sub(_value);  // Deduct allowance for this address
    Transfer(_from, _to, _value);                                               // Raise Transfer event
    return true;
  }

  function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
    return allowances[_owner][_spender];
  }

  function mintTokens(address _to, uint256 _amount) {
    require(msg.sender == crowdsaleContractAddress);

    supply = supply.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    Mint(_to, _amount);
    Transfer(0x0, _to, _amount);
  }

  function salvageTokensFromContract(address _tokenAddress, address _to, uint _amount) onlyOwner{
    IERC20Token(_tokenAddress).transfer(_to, _amount);
  }

  // FOR TESTING TO-DO: Urgently delete before production

  function bypassMint(address _to, uint _amount){
    supply = supply.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    Mint(_to, _amount);
    Transfer(0x0, _to, _amount);
  }

  function bypassBurn(address _from, uint _amount){
    supply = supply.sub(_amount);
    balances[_from] = balances[_from].sub(_amount);
  }

  function bypassSetCrowdsaleAddress(address _newAddress){
    crowdsaleContractAddress = _newAddress;
  }

  function bypassLockUntill(uint _amount){
    lockedUntilBlock = _amount;
    ContractLocked(_amount, "Bypassed lock");
  }
}
