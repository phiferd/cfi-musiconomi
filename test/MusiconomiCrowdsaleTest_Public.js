var Promise = require("bluebird");
var Token = artifacts.require("./MusiconomiToken.sol");
var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");

var Utils = require("./Utils");
const contribute = Utils.contribute;
const assertInvalidOp = Utils.assertInvalidOp;
const checkNumberField = Utils.checkNumberField;
const checkNumberMethod = Utils.checkNumberMethod;
const checkField = Utils.checkField;
const waitUntilBlock = Utils.waitUntilBlock;

const ETH = Math.pow(10, 18);

contract('MusiconomiCrowdsale', function () {

  describe("Day 3: Public sale", () => {
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
    let minCap = 10000 * ETH;
    let maxCap = 20000 * ETH;

    const communityAddresses = [ppUser1, ppUser2, communityUser1, communityUser2];
    const ppAllowances = [10 * ETH, 5 * ETH, 0, 0];
    const communityAllowance = [15 * ETH, 0, 15 * ETH, 15 * ETH];

    before(() => {
      return Promise.resolve()
        .then(() => Crowdsale.new({from: crowdsaleOwner}))
        .then(_crowdsaleInstance => crowdsaleContract = _crowdsaleInstance)
        .then(() => Token.new(crowdsaleContract.address, 0))
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => crowdsaleContract.setToken(tokenContract.address, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.editContributors(communityAddresses, ppAllowances, communityAllowance, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setMinAndMaxCap(minCap, maxCap, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.setMultisigAddress(multiSig, {from: crowdsaleOwner}))
        .then(() => crowdsaleContract.getBlockNumber())
        .then((_firstBlock) => {
          firstBlock = _firstBlock.toNumber();
          presaleStartBlock = firstBlock + 2;
          presaleUnlimitedStartBlock = firstBlock + 3;
          crowdsaleStartBlock = firstBlock + 4;
          crowdsaleEndedBlock = firstBlock + 3000000;
        })
        .then(() => crowdsaleContract.setBlockTimes(presaleStartBlock, presaleUnlimitedStartBlock, crowdsaleStartBlock, crowdsaleEndedBlock, {from: crowdsaleOwner}))
    });

    it('moves to presaleUnlimited after send', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, crowdsaleStartBlock + 1, crowdsaleOwner))
        .then(contribute(crowdsaleContract, ppUser1, 1 * ETH))
        .then(checkNumberField(crowdsaleContract, "crowdsaleState", 3))
    });

    it('allows contributions from non-whitelist members', () => {
      return Promise.resolve()
        .then(() => waitUntilBlock(crowdsaleContract, crowdsaleStartBlock+1, crowdsaleOwner))
        .then(checkNumberMethod(crowdsaleContract, "getContributionAmount", [publicUser1], 0))
        .then(contribute(crowdsaleOwner, publicUser1, 1*ETH))
        .then(checkNumberMethod(crowdsaleContract, "getContributionAmount", [publicUser1], 1*ETH))
    });

    it('Caps contributions based on hard cap', () => {
      return Promise.resolve()
        .then(checkNumberMethod(crowdsaleContract, "calculateMaxContribution", [ppUser1], maxCap - 1 * ETH))
    });
  });
});
