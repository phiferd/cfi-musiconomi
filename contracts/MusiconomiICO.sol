pragma solidity ^0.4.13;

import "./Utils/ReentracyHandlingContract.sol";
import "./Utils/Owned.sol";
import "./Interfaces/IToken.sol";
import "./Interfaces/IERC20Token.sol";

contract MusiconomiICO is ReentracyHandlingContract, Owned{

  struct ContributorData{
    uint priorityPassAllowance;
    uint communityAllowance;
    bool isActive;
    uint contributionAmount;
    uint tokensIssued;
  }

  mapping(address => ContributorData) contributorList;
  uint nextContributorIndex;
  mapping(uint => address) contributorIndexes;

  state icoState = state.pendingStart;
  enum state { pendingStart, priorityPass, openedPriorityPass, ico, icoEnded }

  uint public presaleStartBlock; // TO-DO: Set block
  uint public presaleUnlimitedStartBlock;// TO-DO: Set block
  uint public icoStartBlock;// TO-DO: Set block
  uint public icoEndedBlock;// TO-DO: Set block

  event PresaleStarted(uint blockNumber);
  event PresaleUnlimitedStarted(uint blockNumber);
  event IcoStarted(uint blockNumber);
  event IcoEnded(uint blockNumber);
  event ErrorSendingETH(address to, uint amount);

  IToken token = IToken(0x0);
  uint ethToMusicConversion; // TO-DO: Set conversion eth to music

  uint minCap;  // TO-DO: Set min CAP
  uint maxCap;  // TO-DO: Set max CAP
  uint ethRaised;

  address multisigAddress;

  uint nextContributorToClaim;
  mapping(address => bool) hasClaimedEthWhenFail;

  uint devReward; // TO-DO: Set dev reward
  bool ownerHasClaimedTokens;
  uint cofounditReward; // TO-DO: Set CFI reward
  address cofounditAddress; // TO-DO: Set CFI address
  bool cofounditHasClaimedTokens;

  function() noReentrancy payable{
    require(msg.value != 0);

    bool stateChanged = checkIcoState();

    if (icoState == state.priorityPass){
      if (contributorList[msg.sender].isActive){
        processTransaction(msg.sender, msg.value);
      }else{
        refundTransaction(stateChanged);
      }
    }
    else if(icoState == state.openedPriorityPass){
      if (contributorList[msg.sender].isActive){
        processTransaction(msg.sender, msg.value);
      }else{
        refundTransaction(stateChanged);
      }
    }
    else if(icoState == state.ico){
      processTransaction(msg.sender, msg.value);
    }
    else{
      refundTransaction(stateChanged);
    }
  }

  function checkIcoState() internal returns (bool){
    if (ethRaised == maxCap && icoState != state.icoEnded){
      icoState = state.icoEnded;
      IcoEnded(block.number);
      return true;
    }

    if (block.number > presaleStartBlock && block.number <= presaleUnlimitedStartBlock){
      if (icoState != state.priorityPass){
        icoState = state.priorityPass;
        PresaleStarted(block.number);
        return true;
      }
    }else if(block.number > presaleUnlimitedStartBlock && block.number <= icoStartBlock){
      if (icoState != state.openedPriorityPass){
        icoState = state.openedPriorityPass;
        PresaleUnlimitedStarted(block.number);
        return true;
      }
    }else if(block.number > icoStartBlock && block.number <= icoEndedBlock){
      if (icoState != state.ico){
        icoState = state.ico;
        IcoStarted(block.number);
        return true;
      }
    }else{
      if (icoState != state.icoEnded && block.number > icoEndedBlock){
        icoState = state.icoEnded;
        return true;
      }
    }
  }

  function refundTransaction(bool _stateChanged) internal{
    if (_stateChanged){
      msg.sender.transfer(msg.value);
    }else{
      revert();
    }
  }

  function calculateMaxContribution(address _contributor) constant returns (uint maxContribution){
    uint maxContrib;
    if (icoState == state.priorityPass){
      maxContrib = contributorList[_contributor].priorityPassAllowance + contributorList[_contributor].communityAllowance - contributorList[_contributor].contributionAmount;
      if (maxContrib > (maxCap - ethRaised)){
        maxContrib = maxCap - ethRaised;
      }
    }
    else{
      maxContrib = maxCap - ethRaised;
    }
    return maxContrib;
  }

  function processTransaction(address _contributor, uint _amount) internal{
    uint maxContribution = calculateMaxContribution(_contributor);
    uint contributionAmount = _amount;
    uint returnAmount = 0;
    if (maxContribution < _amount){
      contributionAmount = maxContribution;
      returnAmount = _amount - maxContribution;
    }

    if (contributorList[_contributor].isActive == false){
      contributorList[_contributor].isActive = true;
      contributorList[_contributor].contributionAmount = contributionAmount;
      contributorIndexes[nextContributorIndex] = _contributor;
      nextContributorIndex++;
    }
    else{
      contributorList[_contributor].contributionAmount += contributionAmount;
    }
    ethRaised += contributionAmount;

    uint tokenAmount = contributionAmount * ethToMusicConversion;
    token.mintTokens(_contributor, tokenAmount);
    contributorList[_contributor].tokensIssued += tokenAmount;

    if (returnAmount != 0) _contributor.transfer(returnAmount);
  }

  function editContributors(address[] _contributorAddresses, uint[] _contributorPPAllowances, uint[] _contributorComunityAllowance) onlyOwner{
    require(icoState == state.pendingStart);
    require(_contributorAddresses.length == _contributorPPAllowances.length && _contributorAddresses.length == _contributorComunityAllowance.length);

    for(uint cnt = 0; cnt < _contributorAddresses.length; cnt++){
      contributorList[_contributorAddresses[cnt]].isActive = true;
      contributorList[_contributorAddresses[cnt]].priorityPassAllowance = _contributorPPAllowances[cnt];
      contributorList[_contributorAddresses[cnt]].communityAllowance = _contributorComunityAllowance[cnt];
      contributorIndexes[nextContributorIndex] = _contributorAddresses[cnt];
      nextContributorIndex++;
    }
  }

  function salvageTokensFromIcoContract(address _tokenAddres, address _to, uint _amount) onlyOwner{
    IERC20Token(_tokenAddres).transfer(_to, _amount);
  }

  function withdrawEth() onlyOwner{
    require(this.balance != 0);
    require(ethRaised >= minCap);

    multisigAddress.transfer(this.balance);
  }

  function claimEthIfFailed(){
    require(block.number > icoEndedBlock && ethRaised < minCap);
    require(contributorList[msg.sender].contributionAmount > 0);
    require(!hasClaimedEthWhenFail[msg.sender]);
    uint ethContributed = contributorList[msg.sender].contributionAmount;
    hasClaimedEthWhenFail[msg.sender] = true;
    if (!msg.sender.send(ethContributed)){
      ErrorSendingETH(msg.sender, ethContributed);
    }
  }

  function batchReturnEthIfFailed(uint _numberOfReturns) onlyOwner{
    require(block.number > icoEndedBlock && ethRaised < minCap);
    address currentParticipantAddress;
    uint contribution;
    for (uint cnt = 0; cnt < _numberOfReturns; cnt++){
      currentParticipantAddress = contributorIndexes[nextContributorToClaim];
      if (currentParticipantAddress == 0x0) return;
      if (!hasClaimedEthWhenFail[currentParticipantAddress]) {
        contribution = contributorList[currentParticipantAddress].contributionAmount;
        hasClaimedEthWhenFail[msg.sender] = true;
        if (!currentParticipantAddress.send(contribution)){
          ErrorSendingETH(currentParticipantAddress, contribution);
        }
      }
      nextContributorToClaim += 1;
    }
  }

  function withdrawRemainingBalanceForManualRecovery() onlyOwner{
    require(this.balance != 0);
    require(block.number > icoEndedBlock);
    require(contributorIndexes[nextContributorToClaim] == 0x0);
    multisigAddress.transfer(this.balance);
  }

  function setMultisigAddress(address _newAddress) onlyOwner{
    multisigAddress = _newAddress;
  }

  function setToken(address _newAddress) onlyOwner{
    token = IToken(_newAddress);
  }

  function claimCoreTeamsTokens(address _to) onlyOwner{
    require(icoState == state.icoEnded);
    require(!ownerHasClaimedTokens);

    token.mintTokens(_to, devReward);
    ownerHasClaimedTokens = true;
  }

  function claimCofounditTokens(){
    require(msg.sender == cofounditAddress);
    require(icoState == state.icoEnded);
    require(!cofounditHasClaimedTokens);

    token.mintTokens(cofounditAddress, cofounditReward);
    cofounditHasClaimedTokens = true;
  }

  /* This part is here only for testing and will not be included into final version */
  //
  function killContract() onlyOwner{
    selfdestruct(msg.sender);
  }
}
