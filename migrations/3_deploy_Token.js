var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");             //For production use this .sol
var Token = artifacts.require("./MusiconomiToken.sol");         //For production use this .sol
var SafeMathLib = artifacts.require("./Utils/SafeMath.sol");
var SimpleContract = artifacts.require("./MisbehavingContract.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMathLib);
  deployer.deploy(SimpleContract);
  deployer.link(SafeMathLib, Token);
  deployer.deploy(Token, Crowdsale.deployed().then(function(crowdsaleInsance){return crowdsaleInsance.address}), 100);
};
