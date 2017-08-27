var Promise = require("bluebird");
var Token = artifacts.require("./MusiconomiToken.sol");
var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
var Simple = artifacts.require("./SimpleContract.sol");
const ETH = Math.pow(10, 18);

contract('MusiconomiCrowdsale', function () {

  describe("Day 1 of Pre-sale", () => {
    let crowdsaleContract;
    let tokenContract;


    let firstBlock;
    let presaleStartBlock;
    let presaleUnlimitedStartBlock;
    let crowdsaleStartBlock;
    let crowdsaleEndedBlock;

    let ownerMinter = web3.eth.accounts[0];
    let crowdsaleOwner = web3.eth.accounts[1];
    let multiSig = web3.eth.accounts[2];
    let other = web3.eth.accounts[3];
    let ppUser1 = web3.eth.accounts[4];
    let ppUser2 = web3.eth.accounts[5];
    let communityUser1 = web3.eth.accounts[6];
    let communityUser2 = web3.eth.accounts[7];
    let publicUser1 = web3.eth.accounts[8];
    let publicUser2 = web3.eth.accounts[9];

    const communityAddresses = [ppUser1, ppUser2, communityUser1, communityUser2];
    const ppAllowances = [10*ETH, 5*ETH, 0, 0];
    const communityAllowance = [15*ETH, 0, 15*ETH, 15*ETH];

    console.log("ppUser1: " + ppUser1);


    before(() => {
      return Promise.resolve()
        .then(() => Crowdsale.new({from: crowdsaleOwner}))
        .then(_crowdsaleInstance => crowdsaleContract = _crowdsaleInstance)
        .then(() => Token.new(crowdsaleContract.address, 0))
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => crowdsaleContract.setToken(tokenContract.address, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.editContributors(communityAddresses, ppAllowances, communityAllowance, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setMinAndMaxCap(10000*ETH, 20000*ETH, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.getBlockNumber())
        .then((_firstBlock) => {
          firstBlock = _firstBlock.toNumber();
          presaleStartBlock = firstBlock + 5;
          presaleUnlimitedStartBlock = firstBlock + 1000000;
          crowdsaleStartBlock = firstBlock + 2000000;
          crowdsaleEndedBlock = firstBlock + 3000000;
        })
        .then(() => crowdsaleContract.setBlockTimes(presaleStartBlock, presaleUnlimitedStartBlock, crowdsaleStartBlock, crowdsaleEndedBlock, {from: crowdsaleOwner}))
    });

    it('does not allow contributions before presale', () => {
      return Promise.resolve()
        .then(() => assertInvalidOp(crowdsaleContract.send(web3.toWei(1, "ether"), {from: ppUser1})));
    });

    it('moves to presale after send', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, presaleStartBlock+1, crowdsaleOwner))
        .then(contribute(crowdsaleContract, ppUser1, 1*ETH))
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", [], 1))
        .then(checkNumberField(crowdsaleContract, "calculateMaxContribution", [ppUser1], 24*ETH))
    });

    it('Allows participant to contribute multiple times', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, presaleStartBlock+1, crowdsaleOwner))
        .then(checkNumberField(crowdsaleContract, "getContributionAmount", [ppUser2], 0))
        .then(contribute(crowdsaleContract, ppUser2, 1*ETH))
        .then(contribute(crowdsaleContract, ppUser2, 1*ETH))
        .then(checkNumberField(crowdsaleContract, "getContributionAmount", [ppUser2], 2*ETH))
    });

    it('Caps contribution at max', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, presaleStartBlock+1, crowdsaleOwner))
        .then(checkNumberField(crowdsaleContract, "getContributionAmount", [communityUser1], 0))
        .then(contribute(crowdsaleContract, communityUser1, 16*ETH))
        .then(checkNumberField(crowdsaleContract, "getContributionAmount", [communityUser1], 15*ETH))
    });

    it('does not allow presale contributions from non-whitelist members', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, presaleStartBlock+1, crowdsaleOwner))
        .then(() => assertInvalidOp(crowdsaleContract.send(web3.toWei(1, "ether"), {from: publicUser1})))
    });

    it('does not allow eth to be claimed before last block', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, presaleStartBlock+1, crowdsaleOwner))
        .then(contribute(crowdsaleContract, ppUser1, 1*ETH))
        .then(() => assertInvalidOp(crowdsaleContract.claimEthIfFailed()))
    })
  });

  // Dummy method that will advance through the blocks.  TestRPC has some methods that are supposed to do this
  // automatically, but they don't seem to work very well.
  function waitUntilBlock(crowdsaleContract, block, crowdsaleOwner) {
    return Promise.resolve()
      .then(() => crowdsaleContract.getBlockNumber())
      .then((_currentBlock) => {
        if (_currentBlock.toNumber() >= block) {
          return true;
        }
        else {
          console.log("Waiting for block " + block + ", at block " + _currentBlock);
          return Promise.resolve()
            .then(() => crowdsaleContract.multisigAddress.call())
            .then((_address) => crowdsaleContract.setMultisigAddress(_address, {from: crowdsaleOwner}))
            .then(() => waitUntilBlock(crowdsaleContract, block, crowdsaleOwner))
        }
      })
  }

  function contribute(contract, sender, value) {
    return () => Promise.resolve()
      .then(() => contract.sendTransaction({from: sender, value: value, gas: 940000}))
  }


  function checkNumberField(contract, field, args, expected) {
    return () => Promise.resolve()
      .then(() => contract[field].call(...args))
      .then(_value => assert.equal(expected, _value.toNumber(), field + " was " + _value + ", expected " + expected));
  }

  function checkField(contract, field, expected) {
    return () => Promise.resolve()
      .then(() => contract[field].call())
      .then(_value => assert.equal(expected, _value, field + " was " + _value + ", expected " + expected));
  }

  function assertInvalidOp(p) {
    return  p
      .then(() => assert(false, "It should have failed"))
      .catch(_error => assert(_error.toString().indexOf("invalid opcode") !== -1, _error.toString()))
  }
});
