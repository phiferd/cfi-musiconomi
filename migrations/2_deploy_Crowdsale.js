var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
var SafeMathLib = artifacts.require("./Utils/SafeMath.sol");
var SingleTokenLocker = artifacts.require("./SingleTokenLocker.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMathLib);
  deployer.deploy(SingleTokenLocker);
  deployer.link(SafeMathLib, Crowdsale);
  deployer.deploy(Crowdsale);
};
