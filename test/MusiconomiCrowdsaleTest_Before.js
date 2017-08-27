var Promise = require("bluebird");
var Token = artifacts.require("./MusiconomiToken.sol");
var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
const ETH = Math.pow(10, 18);

var Utils = require("./Utils");
const contribute = Utils.contribute;
const assertInvalidOp = Utils.assertInvalidOp;
const checkNumberField = Utils.checkNumberField;
const checkField = Utils.checkField;
const waitUntilBlock = Utils.waitUntilBlock;


contract('MusiconomiCrowdsale', function () {

  describe("Contract Setup", () => {
    let crowdsaleContract;
    let tokenContract;
    let firstBlock;
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
    const ppAllowances =       [10*ETH, 5*ETH, 0,      0];
    const communityAllowance = [15*ETH, 0,     15*ETH, 15*ETH];

    before(() => {
      return Promise.resolve()
        .then(() => Crowdsale.new({from: crowdsaleOwner}))
        .then(_crowdsaleInstance => crowdsaleContract = _crowdsaleInstance)
        .then(() => Token.new(crowdsaleContract.address, 0))
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => crowdsaleContract.setToken(tokenContract.address, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.getBlockNumber())
        .then((_firstBlock) => firstBlock = _firstBlock.toNumber())
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

    it('allows pp/community to be configured', () => {
      return Promise.resolve()
        .then(() => crowdsaleContract.editContributors(communityAddresses, ppAllowances, communityAllowance, {from: crowdsaleOwner}))
        .then(checkNumberField(crowdsaleContract, "nextContributorIndex", 4))
        .then(() => crowdsaleContract.getConfiguredMaxContribution(ppUser1))
        .then((_max) => assert.equal(25*ETH, _max.toNumber(), "Max contribution is not correct"))

        .then(() => crowdsaleContract.getConfiguredMaxContribution(ppUser2))
        .then((_max) => assert.equal(5*ETH, _max.toNumber(), "Max contribution is not correct"))

        .then(() => crowdsaleContract.getConfiguredMaxContribution(communityUser1))
        .then((_max) => assert.equal(15*ETH, _max.toNumber(), "Max contribution is not correct"))

        .then(() => crowdsaleContract.getConfiguredMaxContribution(communityUser2))
        .then((_max) => assert.equal(15*ETH, _max.toNumber(), "Max contribution is not correct"))

        .then(() => crowdsaleContract.getConfiguredMaxContribution(publicUser1))
        .then((_max) => assert.equal(0, _max.toNumber(), "Max contribution is not correct"))
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

    it('DOES NOT allow non-owner to set the community list', () => {
      return assertInvalidOp(crowdsaleContract.editContributors(communityAddresses, ppAllowances, communityAllowance, {from: other}))
    });
  });
});
