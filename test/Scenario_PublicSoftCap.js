var Scenarios = require("./ScenarioBuilder");
var Utils = require("./Utils");

contract('Public Sale, Soft Cap', function () {
  let config;
  beforeEach(() => {
    return Scenarios.publicSaleSuccess_hardCapNotReached().then(c => config = c);
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
  })
});
