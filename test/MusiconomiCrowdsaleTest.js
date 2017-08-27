var Promise = require("bluebird");
var Token = artifacts.require("./MusiconomiToken.sol");
var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
const ETH = Math.pow(10, 18);

contract('MusiconomiCrowdsale', function () {

  describe("Contract Setup", () => {
    let crowdsaleContract;
    let tokenContract;
    let firstBlock;
    let ownerMinter = web3.eth.accounts[0];
    let crowdsaleOwner = web3.eth.accounts[1];
    let multiSig = web3.eth.accounts[2];
    let other = web3.eth.accounts[3];

    before(() => {
      return Promise.resolve()
        .then(() => Crowdsale.new({from: crowdsaleOwner}))
        .then(_crowdsaleInstance => crowdsaleContract = _crowdsaleInstance)
        .then(() => Token.new(crowdsaleContract.address, 0))
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => crowdsaleContract.setToken(tokenContract.address, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.getBlockNumber())
        .then((_firstBlock) => firstBlock = _firstBlock)
    });

    it('references the token contract', () => {
      return Promise.resolve()
        .then(checkField(crowdsaleContract, "token", tokenContract.address))
    });

    it('starts in pending', () => {
      return Promise.resolve()
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", 0))
    });

    it('sets the min and max caps', () => {
      return Promise.resolve()
        .then(() => crowdsaleContract.setMinAndMaxCap(100, 200, {from: crowdsaleOwner}))
        .then(checkNumberField(crowdsaleContract, "minCap", 100))
        .then(checkNumberField(crowdsaleContract, "maxCap", 200))
    });

    it('sets the block ranges', () => {
      return Promise.resolve()
        .then(() => crowdsaleContract.setBlockTimes(firstBlock+100, firstBlock+101, firstBlock+102, firstBlock+103, {from: crowdsaleOwner}))
        .then(checkNumberField(crowdsaleContract, "presaleStartBlock", firstBlock+100))
        .then(checkNumberField(crowdsaleContract, "presaleUnlimitedStartBlock", firstBlock+101))
        .then(checkNumberField(crowdsaleContract, "crowdsaleStartBlock", firstBlock+102))
        .then(checkNumberField(crowdsaleContract, "crowdsaleEndedBlock", firstBlock+103))
    });

    it('sets the multisig address', () => {
      return Promise.resolve()
        .then(() => crowdsaleContract.setMultisigAddress(multiSig, {from: crowdsaleOwner}))
        .then(checkField(crowdsaleContract, "multisigAddress", multiSig));
    });

    it('DOES NOT allow non-owner to set the multisig address', () => {
      return assertInvalidOp(crowdsaleContract.setMultisigAddress(multiSig, {from: other}))
    });

    it('DOES NOT allow non-owner to set the min/max', () => {
      return assertInvalidOp(crowdsaleContract.setMinAndMaxCap(100, 200, {from: other}))
    });

    it('DOES NOT allow non-owner to set the block times', () => {
      return assertInvalidOp(crowdsaleContract.setBlockTimes(firstBlock+100, firstBlock+101, firstBlock+102, firstBlock+103, {from: other}))
    });
  });

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

    before(() => {
      return Promise.resolve()
        .then(() => Crowdsale.new({from: crowdsaleOwner}))
        .then(_crowdsaleInstance => crowdsaleContract = _crowdsaleInstance)
        .then(() => Token.new(crowdsaleContract.address, 0))
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => crowdsaleContract.setToken(tokenContract.address, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.getBlockNumber())
        .then((_firstBlock) => {
          firstBlock = _firstBlock;
          presaleStartBlock = _firstBlock + 10;
          presaleUnlimitedStartBlock = _firstBlock + 1000000;
          crowdsaleStartBlock = _firstBlock + 2000000;
          crowdsaleEndedBlock = _firstBlock + 3000000;
        })
        .then(() => crowdsaleContract.setMinAndMaxCap(100, 200, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setBlockTimes(firstBlock+100, firstBlock+101, firstBlock+102, firstBlock+103, {from: crowdsaleOwner}))
    });
  });

  function checkNumberField(contract, field, expected) {
    return () => Promise.resolve()
      .then(() => contract[field].call())
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
