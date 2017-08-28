var Promise = require("bluebird");
var Token = artifacts.require("./MusiconomiToken.sol");
var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
const BigNumber = require("bignumber.js");
const MIL = new BigNumber(1000000);
const ETH = Math.pow(10, 18);

var Utils = require("./Utils");
const contribute = Utils.contribute;
const assertInvalidOp = Utils.assertInvalidOp;
const checkNumberField = Utils.checkNumberField;
const checkNumberMethod = Utils.checkNumberMethod;
const checkField = Utils.checkField;
const waitUntilBlock = Utils.waitUntilBlock;

const scenarioBuilder = {
  setupDefaults: function () {
    const config = {
      ownerMinter: web3.eth.accounts[0],
      crowdsaleOwner: web3.eth.accounts[1],
      multiSig: web3.eth.accounts[2],
      other: web3.eth.accounts[3],
      ppUser1: web3.eth.accounts[4],
      ppUser2: web3.eth.accounts[5],
      communityUser1: web3.eth.accounts[6],
      communityUser2: web3.eth.accounts[7],
      cofounditAddress: web3.eth.accounts[7], // duplicated
      publicUser1: web3.eth.accounts[8],
      publicUser2: web3.eth.accounts[9],
      capsData: Utils.computeCapsFromETH(10, 20, MIL.times(100))
    };

    config.communityAddresses = [config.ppUser1, config.ppUser2, config.communityUser1, config.communityUser2];
    config.ppAllowances = [10 * ETH, 5 * ETH, 0, 0];
    config.communityAllowance = [15 * ETH, 0, 15 * ETH, 15 * ETH];

    config.cofounditReward = config.capsData.maxTokenSupply.dividedBy(50);
    scenarioBuilder.getAllBalances(config)
      .then(b => config.startingBalances = b);

    return Promise.resolve()
      .then(() => Crowdsale.new({from: config.crowdsaleOwner}))
      .then(_crowdsaleInstance => config.crowdsaleContract = _crowdsaleInstance)
      .then(() => Token.new(config.crowdsaleContract.address, 0))
      .then(_tokenInstance => config.tokenContract = _tokenInstance)
      .then(() => config.crowdsaleContract.setToken(config.tokenContract.address, {from: config.crowdsaleOwner}))
      .then(() => config.crowdsaleContract.editContributors(config.communityAddresses, config.ppAllowances, config.communityAllowance, {from: config.crowdsaleOwner}))
      .then(() => config.crowdsaleContract.setMinAndMaxCap(config.capsData.minCap, config.capsData.maxCap, {from: config.crowdsaleOwner}))
      .then(() => config.crowdsaleContract.setMultisigAddress(config.multiSig, {from: config.crowdsaleOwner}))
      .then(() => config.crowdsaleContract.setMaxTokenSupply(config.capsData.maxTokenSupply, {from: config.crowdsaleOwner}))
      .then(() => config.crowdsaleContract.setCofounditReward(config.cofounditReward, {from: config.crowdsaleOwner}))
      .then(() => config.crowdsaleContract.setCofounditAddress(config.cofounditAddress, {from: config.crowdsaleOwner}))
      .then(() => config.crowdsaleContract.getBlockNumber())
      .then((_firstBlock) => config.firstBlock = _firstBlock.toNumber())
      .then(() => config);
  },
  
  hitHardCapOnDay2: function() {
    return scenarioBuilder.setupDefaults()
      .then(config => {
        return Promise.resolve()
          .then(() => {
            config.presaleStartBlock = config.firstBlock + 2;
            config.presaleUnlimitedStartBlock = config.firstBlock + 3;
            config.crowdsaleStartBlock = config.firstBlock + 2000000;
            config.crowdsaleEndedBlock = config.firstBlock + 3000000;
          })
          .then(() => config.crowdsaleContract.setBlockTimes(config.presaleStartBlock, config.presaleUnlimitedStartBlock, config.crowdsaleStartBlock, config.crowdsaleEndedBlock, {from: config.crowdsaleOwner}))

          .then(() => waitUntilBlock(config.crowdsaleContract, config.presaleStartBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.ppUser1, 10 * ETH))

          .then(() => waitUntilBlock(config.crowdsaleContract, config.presaleUnlimitedStartBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.ppUser2, 5 * ETH))
          .then(contribute(config.crowdsaleContract, config.communityUser1, 5 * ETH))
          .then(contribute(config.crowdsaleContract, config.communityUser1, 1 * ETH)) // forcing it to end since maxCap check happens first rather than last
          .then(checkNumberField(config.crowdsaleContract, "crowdsaleState", 4))
          .then(() => config)
      })
  },

  publicSaleSuccess_hardCapNotReached: function() {
    return scenarioBuilder.setupDefaults()
      .then(config => {
        return Promise.resolve()
          .then(() => {
            config.presaleStartBlock = config.firstBlock + 2;
            config.presaleUnlimitedStartBlock = config.firstBlock + 4;
            config.crowdsaleStartBlock = config.firstBlock + 6;
            config.crowdsaleEndedBlock = config.firstBlock + 8;
          })
          .then(() => config.crowdsaleContract.setBlockTimes(config.presaleStartBlock, config.presaleUnlimitedStartBlock, config.crowdsaleStartBlock, config.crowdsaleEndedBlock, {from: config.crowdsaleOwner}))

          .then(() => waitUntilBlock(config.crowdsaleContract, config.presaleStartBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.ppUser1, 10 * ETH))

          .then(() => waitUntilBlock(config.crowdsaleContract, config.presaleUnlimitedStartBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.ppUser2, 1 * ETH))
          .then(contribute(config.crowdsaleContract, config.communityUser1, 1 * ETH)) // forcing it to end since maxCap check happens first rather than last

          .then(() => waitUntilBlock(config.crowdsaleContract, config.crowdsaleStartBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.publicUser1, 1 * ETH))

          .then(() => waitUntilBlock(config.crowdsaleContract, config.crowdsaleEndedBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.publicUser2, 1 * ETH))
          .then(checkNumberField(config.crowdsaleContract, "crowdsaleState", 4))

          .then(() => config)
      })
  },

  publicSaleFailure: function() {
    return scenarioBuilder.setupDefaults()
      .then(config => {
        return Promise.resolve()
          .then(() => {
            config.presaleStartBlock = config.firstBlock + 2;
            config.presaleUnlimitedStartBlock = config.firstBlock + 4;
            config.crowdsaleStartBlock = config.firstBlock + 6;
            config.crowdsaleEndedBlock = config.firstBlock + 8;
          })
          .then(() => config.crowdsaleContract.setBlockTimes(config.presaleStartBlock, config.presaleUnlimitedStartBlock, config.crowdsaleStartBlock, config.crowdsaleEndedBlock, {from: config.crowdsaleOwner}))

          .then(() => waitUntilBlock(config.crowdsaleContract, config.presaleStartBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.ppUser1, 1 * ETH))

          .then(() => waitUntilBlock(config.crowdsaleContract, config.presaleUnlimitedStartBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.ppUser2, 1 * ETH))
          .then(contribute(config.crowdsaleContract, config.communityUser1, 1 * ETH)) // forcing it to end since maxCap check happens first rather than last

          .then(() => waitUntilBlock(config.crowdsaleContract, config.crowdsaleStartBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.publicUser1, 1 * ETH))

          .then(() => waitUntilBlock(config.crowdsaleContract, config.crowdsaleEndedBlock + 1, config.crowdsaleOwner))
          .then(contribute(config.crowdsaleContract, config.publicUser2, 1 * ETH))
          .then(Utils.printBalance("contract", config.crowdsaleContract.address))
          .then(checkNumberField(config.crowdsaleContract, "crowdsaleState", 4))

          .then(() => config)
      })
  },

  getAllBalances: function(config) {
    return Promise.all([
      web3.eth.getBalance(config.ppUser1),
      web3.eth.getBalance(config.ppUser2),
      web3.eth.getBalance(config.communityUser1),
      web3.eth.getBalance(config.communityUser2),
      web3.eth.getBalance(config.publicUser1),
      web3.eth.getBalance(config.publicUser2),
      web3.eth.getBalance(config.other),
      web3.eth.getBalance(config.multiSig)]
    )
  },

  compareBalances: function(maxGasAllowance, starting, ending) {
    return Promise.resolve()
      .then(() => {
        for (let i=0; i < starting.length; i++) {
          const delta = starting[i].minus(ending[i]).abs();
          assert(delta.lessThan(maxGasAllowance), "Values are not within the gas allowance");
        }
      })
  },

  collectRewards_CofounditThenDev: function(config) {
    return Promise.resolve()
      .then(() => config.tokenContract.totalSupply())
      .then((tokensSold) => {
        return Promise.resolve()
          .then(() => config.crowdsaleContract.claimCofounditTokens({from: config.cofounditAddress}))
          .then(checkNumberMethod(config.tokenContract, "balanceOf", [config.cofounditAddress], config.cofounditReward))
          .then(() => config.tokenContract.totalSupply())
          .then((s) => assert(s.equals(config.cofounditReward.plus(tokensSold))))
      })
      .then(() => config.tokenContract.totalSupply())
      .then((tokensSoldPlusReward) => {
        const expectedDevReward = config.capsData.maxTokenSupply.minus(tokensSoldPlusReward);
        return Promise.resolve()
          .then(() => config.crowdsaleContract.claimCoreTeamsTokens(config.multiSig, {from: config.crowdsaleOwner}))
          .then(() => config.tokenContract.totalSupply())
          .then((s) => assert(s.equals(config.capsData.maxTokenSupply)))
          .then(checkNumberMethod(config.tokenContract, "balanceOf", [config.multiSig], expectedDevReward))
      })
  },

  collectRewards_DevThenCofoundit: function(config) {
    return Promise.resolve()
      .then(() => config.tokenContract.totalSupply())
      .then((tokensSold) => {
        const expectedDevReward = config.capsData.maxTokenSupply.minus(config.cofounditReward).minus(tokensSold);
        return Promise.resolve()
          .then(() => config.crowdsaleContract.claimCoreTeamsTokens(config.multiSig, {from: config.crowdsaleOwner}))
          .then(() => config.tokenContract.totalSupply())
          .then((s) => assert(s.equals(config.capsData.maxTokenSupply.minus(config.cofounditReward))))
          .then(checkNumberMethod(config.tokenContract, "balanceOf", [config.multiSig], expectedDevReward))
      })
      .then(() => config.crowdsaleContract.claimCofounditTokens({from: config.cofounditAddress}))
      .then(checkNumberMethod(config.tokenContract, "balanceOf", [config.cofounditAddress], config.cofounditReward))
  },

  ensureRefundsAreNotAllowed: function(config) {
    return Promise.resolve()
      .then(assertInvalidOp(config.crowdsaleContract.claimEthIfFailed({from: config.ppUser1})))
      .then(assertInvalidOp(config.crowdsaleContract.withdrawRemainingBalanceForManualRecovery({from: config.crowdsaleOwner})))
      .then(assertInvalidOp(config.crowdsaleContract.batchReturnEthIfFailed(10, {from: config.crowdsaleOwner})))
  },

  collectEthReward: function(config) {
    let multiSigBalanceBefore;
    let contractTotal;
    return Promise.resolve()
      .then(() => web3.eth.getBalance(config.multiSig))
      .then(_bal => multiSigBalanceBefore = _bal)
      .then(() => web3.eth.getBalance(config.crowdsaleContract.address))
      .then(_bal => contractTotal = _bal)
      .then(() => config.crowdsaleContract.withdrawEth({from: config.crowdsaleOwner}))
      .then(() => web3.eth.getBalance(config.crowdsaleContract.address))
      .then((_bal) => assert.equal(0, _bal.toNumber()))
      .then(() => web3.eth.getBalance(config.multiSig))
      .then((_bal) => assert(multiSigBalanceBefore.plus(contractTotal).equals(_bal), "Multisig did not get the right reward!"));
  }
};

module.exports = scenarioBuilder;