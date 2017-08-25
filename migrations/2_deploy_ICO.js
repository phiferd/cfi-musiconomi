var ICO = artifacts.require("./MusiconomiICO.sol");
var SafeMathLib = artifacts.require("./Utils/SafeMath.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMathLib);
  deployer.link(SafeMathLib, ICO);
  deployer.deploy(ICO);
};
