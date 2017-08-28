var Scenarios = require("./ScenarioBuilder");
var Utils = require("./Utils");

contract('Day 2, Hard cap reached', function () {
  let config;
  beforeEach(() => {
    return Scenarios.hitHardCapOnDay2().then(c => config = c)
  });

  it('Allows eth to be collected first', () => {
    return Scenarios.collectEthReward(config)
      .then(() => Scenarios.ensureRefundsAreNotAllowed(config))
      .then(() => Scenarios.collectRewards_DevThenCofoundit(config))
  });

  it('Allows cofoundit to collect reward first', () => {
    return Scenarios.collectRewards_CofounditThenDev(config)
      .then(() => Scenarios.ensureRefundsAreNotAllowed(config))
      .then(() => Scenarios.collectEthReward(config))
  });

  it('Allows core team to claim tokens', () => {
    return Scenarios.collectRewards_DevThenCofoundit(config)
      .then(() => Scenarios.ensureRefundsAreNotAllowed(config))
      .then(() => Scenarios.collectEthReward(config))
  });

  it('Does not allow refunds', () => {
    return Scenarios.ensureRefundsAreNotAllowed(config)
  })
});
