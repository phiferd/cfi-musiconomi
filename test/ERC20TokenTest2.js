var Promise = require("bluebird");
var Token = artifacts.require("./MusiconomiToken.sol");
const ETH = Math.pow(10, 18);

contract('ERC20TokenTest', function () {

  describe("Test mintTokens", () => {
    let tokenContract;
    let ownerMinter = web3.eth.accounts[0];
    let mintingSource = web3.eth.accounts[2];
    let notOwner = web3.eth.accounts[1];
    let startingBalance;
    let startingTotalSupply;
    let mintValue = 100 * ETH;

    before(() => {
      return Token.new(ownerMinter, 0)
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => tokenContract.balanceOf(mintingSource))
        .then((_startingBalance) => startingBalance = _startingBalance.toNumber())
        .then(() => tokenContract.totalSupply.call())
        .then((_startingTotalSupply) => startingTotalSupply = _startingTotalSupply.toNumber())
    });

    it('Updates balances when tokens are minted', function () {
      return Promise.resolve()
      // A: mint some tokens for mintingSource
      //   A.1: see if the caller gets the balance
      //   A.2: see if the total supply increased correctly
        .then(() => tokenContract.mintTokens(mintingSource, mintValue, {from: ownerMinter}))
        .then(() => tokenContract.balanceOf(mintingSource))
        .then((_endBalance) => assert.equal(startingBalance + mintValue, _endBalance.toNumber()))
        .then(() => tokenContract.totalSupply.call())
        .then((_endTotalSupply) => assert.equal(startingTotalSupply + mintValue, _endTotalSupply.toNumber(), "Total supply was not set properly!"))
    });

    it('Does not allow anyone to call mintTokens', function () {
      return Promise.resolve()
      // Ensure that notOwner cannot mint tokens
        .then(() => {
            return tokenContract.mintTokens(mintingSource, mintValue, {from: notOwner})
              .then(() => assert(false, "It should have thrown when user without permissions tries to mint tokens!"))
              .catch(_error => assert(_error.toString().indexOf("invalid opcode") !== -1, _error.toString()))
          }
        )
    });
  });

  describe("Transfers ownership", () => {
    let tokenContract;
    let ownerMinter = web3.eth.accounts[0];
    let user1 = web3.eth.accounts[1];
    let otherUser = web3.eth.accounts[2];

    beforeEach(() => {
      return Token.new(ownerMinter, 0)
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => tokenContract.transferOwnership(user1, {from: ownerMinter}))
    });

    it('sets new owner', () => {
      return Promise.resolve()
        .then(() => tokenContract.newOwner.call())
        .then((_newOwner) => assert.equal(user1, _newOwner, "New Owner was not set"))
    });

    it('allows accept', () => {
      return Promise.resolve()
        .then(() => tokenContract.acceptOwnership({from: user1}))
        .then(() => tokenContract.owner.call())
        .then((_owner) => assert.equal(user1, _owner, "Accept did not work"))
    });

    it('does not allow another caller to accept', () => {
      return Promise.resolve()
        .then(() => tokenContract.acceptOwnership({from: otherUser}))
        .then(() => assert(false, "It should have failed"))
        .catch(_error => assert(_error.toString().indexOf("invalid opcode") !== -1, _error.toString()))
    })
  });

  describe("Transfers tokens", () => {
    let tokenContract;
    let ownerMinter = web3.eth.accounts[0];
    let user1 = web3.eth.accounts[1];
    let user2 = web3.eth.accounts[2];
    let someoneElse = web3.eth.accounts[3];
    let mintValue = 90 * ETH;

    beforeEach(() => {
      return Token.new(ownerMinter, 0)
        .then(_tokenInstance => tokenContract = _tokenInstance)
        .then(() => tokenContract.mintTokens(user1, mintValue, {from: ownerMinter}))
    });

    it('transfers tokens', () => {
      return Promise.resolve()
        .then(tokenContract.transfer(user2, 7*ETH, {from: user1}))
        .delay(100)
        .then(() => tokenContract.balanceOf(user1))
        .then((_balance) => assert.equal(83*ETH, _balance.toNumber()))
        .then(() => tokenContract.balanceOf(user2))
        .then((_balance) => assert.equal(7*ETH, _balance.toNumber()))
    });

    it('does not allow transfers from 0x0', () => {
      return tokenContract.transfer(0x0, 12345, {from: someoneElse})
        .then(() => assert(false, "It should have failed"))
        .catch(_error => assert(_error.toString().indexOf("invalid opcode") !== -1, _error.toString()))
    });

    it('does not allow transfers while locked', () => {
      return Promise.resolve()
        .then(() => tokenContract.lockUntil(9999999999, "Reason1", {from: ownerMinter}))
        .delay(100)
        .then(() => tokenContract.transfer(user2, 1*ETH, {from: user1}))
        .then(() => assert(false, "It should have failed"))
        .catch(_error => assert(_error.toString().indexOf("invalid opcode") !== -1, _error.toString()))
        .then(() => tokenContract.lockUntil(0, "Reason2", {from: ownerMinter}))
    })
  });
});
