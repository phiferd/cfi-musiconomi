var Promise = require("bluebird");
var Token = artifacts.require("./MusiconomiToken.sol");
var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
var MisbehavingContract = artifacts.require("./MisbehavingContract.sol");

var Utils = require("./Utils");
const contribute = Utils.contribute;
const assertInvalidOp = Utils.assertInvalidOp;
const checkNumberField = Utils.checkNumberField;
const checkNumberMethod = Utils.checkNumberMethod;
const checkField = Utils.checkField;
const waitUntilBlock = Utils.waitUntilBlock;

const ETH = Math.pow(10, 18);

contract('MusiconomiCrowdsale: ', function () {

  describe("Day 3:", () => {
    let crowdsaleContract;
    let tokenContract;
    let misbehavingContract;

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
    let minCap = 10000 * ETH;
    let maxCap = 20000 * ETH;

    const communityAddresses = [ppUser1, ppUser2, communityUser1, communityUser2];
    const ppAllowances = [10 * ETH, 5 * ETH, 0, 0];
    const communityAllowance = [15 * ETH, 0, 15 * ETH, 15 * ETH];

    const unrefundableAmount = 100000;

    before(() => {
      return Promise.resolve()
        .then(() => Crowdsale.new({from: crowdsaleOwner}))
        .then(_crowdsaleInstance => crowdsaleContract = _crowdsaleInstance)
        .then(() => Token.new(crowdsaleContract.address, 0))
        .then(_tokenInstance => tokenContract = _tokenInstance)

        // setup a contract that can send eth to the crowdsale, but cannot get a refund
        .then(() => MisbehavingContract.new(crowdsaleContract.address, unrefundableAmount))
        .then(_m => misbehavingContract = _m)
        .then(() => web3.eth.sendTransaction({to: misbehavingContract.address, from: other, value: 1*ETH}))

        .then(() => crowdsaleContract.setToken(tokenContract.address, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.editContributors(communityAddresses, ppAllowances, communityAllowance, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setMinAndMaxCap(minCap, maxCap, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setMultisigAddress(multiSig, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.getBlockNumber())
        .then((_firstBlock) => {
          firstBlock = _firstBlock.toNumber();
          presaleStartBlock = firstBlock + 2;
          presaleUnlimitedStartBlock = firstBlock + 4;
          crowdsaleStartBlock = firstBlock + 6;
          crowdsaleEndedBlock = firstBlock + 15;
        })
        .then(() => crowdsaleContract.setBlockTimes(presaleStartBlock, presaleUnlimitedStartBlock, crowdsaleStartBlock, crowdsaleEndedBlock, {from: crowdsaleOwner}))
    });

    it('moves to through states to public sale', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, presaleStartBlock + 1, crowdsaleOwner))
        .then(contribute(crowdsaleContract, ppUser1, 1 * ETH))
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", 1))
        .then(() => waitUntilBlock(crowdsaleContract, presaleUnlimitedStartBlock + 1, crowdsaleOwner))
        .then(contribute(crowdsaleContract, communityUser1, 1 * ETH))
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", 2))
        .then(() => waitUntilBlock(crowdsaleContract, crowdsaleStartBlock + 1, crowdsaleOwner))
        .then(() => misbehavingContract.contribute(crowdsaleContract.address, {from: other, gas: 940000}))
        .then(contribute(crowdsaleContract, communityUser2, 1 * ETH))
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", 3))
    });

    it('ends after last block', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, crowdsaleEndedBlock + 1, crowdsaleOwner))
        .then(checkNumberMethod(crowdsaleContract, "getContributionAmount", [ppUser1], 1*ETH))
        .then(contribute(crowdsaleContract, ppUser1, 1 * ETH))
        .then(checkNumberMethod(crowdsaleContract, "getContributionAmount", [ppUser1], 1*ETH)) // still 1 ETH
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", 4))
    });

    it('should reject contribution after end', () => {
      return Promise.resolve()
      .then(assertInvalidOp(contribute(crowdsaleContract, ppUser1, 1*ETH)()));
    })

    it('should allow individual refund', () => {
      let balanceBeforeRefund;
      let contributed;
      let balanceAfterRefund;
      return Promise.resolve()
        .then(() => web3.eth.getBalance(ppUser1))
        .then(_bal => balanceBeforeRefund = _bal.toNumber())
        .then(() => crowdsaleContract.getContributionAmount(ppUser1))
        .then(_amt => contributed = _amt.toNumber())
        .then(() => crowdsaleContract.claimEthIfFailed({from: ppUser1}))
        .then(() => web3.eth.getBalance(ppUser1))
        .then(_bal => balanceAfterRefund = _bal.toNumber())
        .then(() => assert(balanceAfterRefund > balanceBeforeRefund))
    });

    it('does not allow user to claim refund twice', () => {
      return Promise.resolve()
        .then(assertInvalidOp(crowdsaleContract.claimEthIfFailed({from: ppUser1})))
    })

    it('can NOT do manual recovery before batchReturn', () => {
      return Promise.resolve()
        .then(assertInvalidOp(crowdsaleContract.withdrawRemainingBalanceForManualRecovery({from: crowdsaleOwner})))
    });

    it('can do a batch refund', () => {
      let balanceBeforeRefund;
      let contributed;
      let balanceAfterRefund;
      return Promise.resolve()
        .then(() => web3.eth.getBalance(communityUser1))
        .then(_bal => balanceBeforeRefund = _bal)
        .then(() => crowdsaleContract.getContributionAmount(communityUser1))
        .then(_amt => contributed = _amt)
        .then(() => crowdsaleContract.batchReturnEthIfFailed(10, {from: crowdsaleOwner}))
        .then(() => web3.eth.getBalance(communityUser1))
        .then(_bal => balanceAfterRefund = _bal)
        .then(() => assert(balanceBeforeRefund.plus(contributed).equals(balanceAfterRefund)));
    });

    it('does not allow user to claim refund after batch', () => {
      return Promise.resolve()
        .then(assertInvalidOp(crowdsaleContract.claimEthIfFailed({from: communityUser1})))
    });

    it('does not allow non-owner to batch refund', () => {
      return Promise.resolve()
        .then(assertInvalidOp(crowdsaleContract.batchReturnEthIfFailed(10, {from: communityUser1})))
    });

    it('should not have a balance anymore', () => {
      return Promise.resolve()
        .then(() => web3.eth.getBalance(crowdsaleContract.address))
        .then(_b => assert.equal(unrefundableAmount, _b.toNumber()));
    });

    it('can do manual recovery after batchReturn', () => {
      let multiSigBalanceBefore;
      let multiSigBalanceAfter;
      return Promise.resolve()
        .then(() => web3.eth.getBalance(multiSig))
        .then(_bal => multiSigBalanceBefore = _bal)
        .then(() => crowdsaleContract.withdrawRemainingBalanceForManualRecovery({from: crowdsaleOwner}))
        .then(() => web3.eth.getBalance(multiSig))
        .then((_newBal) => multiSigBalanceAfter = _newBal)
        .then(() => assert((multiSigBalanceBefore.plus(unrefundableAmount)).equals(multiSigBalanceAfter)))
    });
  });
});

// 67603149200000000000
//  1000000000000000000
// 68504020600000000000
//    99128599999995900
