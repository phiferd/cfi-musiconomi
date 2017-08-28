var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");

module.exports = function(deployer) {
  deployer.deploy(Crowdsale);
};
