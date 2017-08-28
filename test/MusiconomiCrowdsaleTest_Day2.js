var Promise = require("bluebird");
var Token = artifacts.require("./MusiconomiToken.sol");
var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
const BigNumber = require("bignumber.js");
const MIL = new BigNumber(1000000);

var Scenarios = require("./ScenarioBuilder");
var Utils = require("./Utils");
const contribute = Utils.contribute;
const assertInvalidOp = Utils.assertInvalidOp;
const checkNumberField = Utils.checkNumberField;
const checkNumberMethod = Utils.checkNumberMethod;
const checkField = Utils.checkField;
const waitUntilBlock = Utils.waitUntilBlock;

const ETH = Math.pow(10, 18);

contract('MusiconomiCrowdsale', function () {

  describe("Day 2 of Pre-sale", () => {
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
    let cofounditAddress = web3.eth.accounts[9];

    const communityAddresses = [ppUser1, ppUser2, communityUser1, communityUser2];
    const ppAllowances = [10 * ETH, 5 * ETH, 0, 0];
    const communityAllowance = [15 * ETH, 0, 15 * ETH, 15 * ETH];

    const capsData = Utils.computeCapsFromETH(10, 20, MIL.times(100));
    const cofounditReward = capsData.maxTokenSupply.dividedBy(50);

    before(() => {
      return Promise.resolve()
        .then(() => Crowdsale.new({from: crowdsaleOwner}))
        .then(_crowdsaleInstance => crowdsaleContract = _crowdsaleInstance)
        .then(() => Token.new(crowdsaleContract.address, 0))
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => crowdsaleContract.setToken(tokenContract.address, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.editContributors(communityAddresses, ppAllowances, communityAllowance, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setMinAndMaxCap(capsData.minCap, capsData.maxCap, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setMultisigAddress(multiSig, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setMaxTokenSupply(capsData.maxTokenSupply, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setCofounditReward(cofounditReward, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setCofounditAddress(cofounditAddress, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.getBlockNumber())
        .then((_firstBlock) => {
          firstBlock = _firstBlock.toNumber();
          presaleStartBlock = firstBlock + 2;
          presaleUnlimitedStartBlock = firstBlock + 3;
          crowdsaleStartBlock = firstBlock + 2000000;
          crowdsaleEndedBlock = firstBlock + 3000000;
        })
        .then(() => crowdsaleContract.setBlockTimes(presaleStartBlock, presaleUnlimitedStartBlock, crowdsaleStartBlock, crowdsaleEndedBlock, {from: crowdsaleOwner}))
    });

    it('moves to presaleUnlimited after send', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, presaleUnlimitedStartBlock + 1, crowdsaleOwner))
        .then(contribute(crowdsaleContract, ppUser1, 1 * ETH))
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", 2))
    });

    it('does not allow presale contributions from non-whitelist members', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, presaleUnlimitedStartBlock+1, crowdsaleOwner))
        .then(() => assertInvalidOp(crowdsaleContract.send(1*ETH, {from: publicUser1})))
    });

    it('Caps contributions based on hard cap', () => {
      return Promise.resolve()
        .then(checkNumberMethod(crowdsaleContract, "calculateMaxContribution", [ppUser1], capsData.maxCap.minus(1 * ETH).toNumber()))
    });

    it('Does NOT Allow withdrawal of funds BEFORE hitting soft cap', () => {
      return Promise.resolve()
        .then(assertInvalidOp(crowdsaleContract.withdrawEth()));
    });

    it('Recognizes soft cap is hit', () => {
      return Promise.resolve()
        .then(contribute(crowdsaleContract, ppUser1, 10 * ETH))
        .then(checkField(crowdsaleContract, "isMinReached", true))
    });

    it('Does NOT allows withdrawal of funds AFTER hitting soft cap by non-owner', () => {
      return Promise.resolve()
        .then(assertInvalidOp(crowdsaleContract.withdrawEth({from: other})))
    });

    it('Allows withdrawal of funds AFTER hitting soft cap', () => {
      let multiSigBalanceBefore;
      let contractTotal;
      return Promise.resolve()
        .then(() => web3.eth.getBalance(multiSig))
        .then(_bal => multiSigBalanceBefore = _bal)
        .then(() => web3.eth.getBalance(crowdsaleContract.address))
        .then(_bal => contractTotal = _bal)
        .then(() => crowdsaleContract.withdrawEth({from: crowdsaleOwner}))
        .then(() => web3.eth.getBalance(crowdsaleContract.address))
        .then((_bal) => assert.equal(0, _bal.toNumber()))
        .then(() => web3.eth.getBalance(multiSig))
        .then((_bal) => assert(multiSigBalanceBefore.plus(contractTotal).equals(_bal)));
    });

    it('Ends after hitting the hard cap', () => {
      return Promise.resolve()
        .then(() => tokenContract.totalSupply()).then((s) => console.log("Supply: " + s))
        .then(contribute(crowdsaleContract, ppUser2, 10 * ETH))
        .then(() => tokenContract.totalSupply()).then((s) => console.log("Supply: " + s))
        .then(contribute(crowdsaleContract, ppUser2, 1 * ETH)) // forcing it to end since maxCap check happens first rather than last
        .then(() => tokenContract.totalSupply()).then((s) => console.log("Supply: " + s))
        .then(() => crowdsaleContract.ethRaised.call())
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", 4))
    });

    it('Allows core team to claim tokens', () => {
      return Promise.resolve()
        .then(() => tokenContract.totalSupply())
        .then((tokensSold) => {
          const expectedDevReward = capsData.maxTokenSupply.minus(cofounditReward).minus(tokensSold);
          return Promise.resolve()
            .then(() => crowdsaleContract.claimCoreTeamsTokens(multiSig, {from: crowdsaleOwner}))
            .then(() => tokenContract.totalSupply())
            .then((s) => assert(s.equals(capsData.maxTokenSupply.minus(cofounditReward))))
            .then(checkNumberMethod(tokenContract, "balanceOf", [multiSig], expectedDevReward))
        })
    })

    it('Allows cofoundit to claim reward', () => {
      return Promise.resolve()
        .then(() => crowdsaleContract.claimCofounditTokens({from: cofounditAddress}))
        .then(checkNumberMethod(tokenContract, "balanceOf", [cofounditAddress], cofounditReward))
    })
  });
});
