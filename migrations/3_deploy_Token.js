var ICO = artifacts.require("./MusiconomiICO.sol");             //For production use this .sol
var Token = artifacts.require("./MusicToken.sol");         //For production use this .sol
var SafeMathLib = artifacts.require("./Utils/SafeMath.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMathLib);
  deployer.link(SafeMathLib, Token);
  deployer.deploy(Token, ICO.deployed().then(function(icoInsance){return icoInsance.address}), 100);
};
