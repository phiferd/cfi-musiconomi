pragma solidity ^0.4.13;

import "../MusicToken.sol";

contract TokenAlterator is MusiconomiToken{
/*
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

  function bypassSetIcoAddress(address _newAddress){
    icoContractAddress = _newAddress;
  }
  */
}
