var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
var SafeMathLib = artifacts.require("./Utils/SafeMath.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMathLib);
  deployer.link(SafeMathLib, Crowdsale);
  deployer.deploy(Crowdsale);
};
