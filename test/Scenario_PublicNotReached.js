var Scenarios = require("./ScenarioBuilder");
var Utils = require("./Utils");
const ETH = Math.pow(10, 18);

contract('Public Sale, Not Reached', function () {
  let config;
  beforeEach(() => {
    return Scenarios.publicSaleFailure().then(c => config = c);
  });

  it('Batch refund can return in batches', () => {
    return Promise.resolve()

      .then(() => config.crowdsaleContract.batchReturnEthIfFailed(2, {from: config.crowdsaleOwner}))
      .then(Utils.checkNumberField(config.crowdsaleContract, "refundCount", 2))
      .then(() => config.crowdsaleContract.batchReturnEthIfFailed(2, {from: config.crowdsaleOwner}))
      .then(Utils.checkNumberField(config.crowdsaleContract, "refundCount", 4))
      .then(() => config.crowdsaleContract.batchReturnEthIfFailed(2, {from: config.crowdsaleOwner}))
      .then(Utils.checkNumberField(config.crowdsaleContract, "refundCount", 5)) // there are only 5 contributors
      .then(() => config.crowdsaleContract.batchReturnEthIfFailed(2, {from: config.crowdsaleOwner}))
      .then(Utils.checkNumberField(config.crowdsaleContract, "refundCount", 5)) // there are only 5 contributors
      .then(() => web3.eth.getBalance(config.crowdsaleContract.address))
      .then(_b => assert.equal(0, _b.toNumber()))
      .then(() => Scenarios.getAllBalances(config))
      .then((newBalances) => {
        return Scenarios.compareBalances(0.2 * ETH, config.startingBalances, newBalances);
      })
  });

  it('Batch refund skips users that got their own refund', () => {
    let beforeBatch;
    return Promise.resolve()
      .then(() => config.crowdsaleContract.claimEthIfFailed({from: config.ppUser1}))
      .then(() => web3.eth.getBalance(config.ppUser1))
      .then(_b => beforeBatch = _b)
      .then(() => config.crowdsaleContract.batchReturnEthIfFailed(10, {from: config.crowdsaleOwner}))
      .then(() => web3.eth.getBalance(config.ppUser1))
      .then(_b => assert(beforeBatch.equals(_b), "ppUser1 was refunded twice!"))
      .then(Utils.checkNumberField(config.crowdsaleContract, "refundCount", 4))
      .then(() => web3.eth.getBalance(config.crowdsaleContract.address))
      .then(_b => assert.equal(0, _b.toNumber()));
  });
});
