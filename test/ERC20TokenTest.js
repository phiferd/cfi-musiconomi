var Crowdsale = artifacts.require("./MusiconomiCrowdsale.sol");
var Token = artifacts.require("./MusiconomiToken.sol");
const ETH = Math.pow(10, 18);

contract('ERC20TokenTest', function(){

	it('Test init values', function(){
		var tokenContract;
		var crowdsaleContract;
		var expectedOwner = web3.eth.accounts[0];
		var expectedLock = 100;

		return Token.deployed().then(function(_tokenInstance) {
			tokenContract = _tokenInstance;
		return Crowdsale.deployed().then(function(_crowdsaleInstance) {
			crowdsaleContract = _crowdsaleInstance;
		return tokenContract.crowdsaleContractAddress.call().then(function(_crowdsaleAddy) {
			assert.equal(_crowdsaleAddy, crowdsaleContract.address, "Crowdsale address was not set properly!");

		});
		});
		});
	});

	it('Test mintTokens', function(){
		var tokenContract;
		var crowdsaleContract;
		var ownerMinter = web3.eth.accounts[0];
		var mintingSource = web3.eth.accounts[2]
		var notOwner = web3.eth.accounts[1];
		var mintValue = 100 * ETH;

		var startingBalance;
		var startingTotalSupply;

		return Token.deployed().then(function(_tokenInstance) {
			tokenContract = _tokenInstance;
		return tokenContract.bypassSetCrowdsaleAddress(ownerMinter).then(function() {
		return tokenContract.balanceOf(mintingSource).then(function(_startingBalance){
			startingBalance = _startingBalance.toNumber();
		return tokenContract.totalSupply.call().then(function(_startingTotalSupply){
			startingTotalSupply = _startingTotalSupply.toNumber();
		return tokenContract.mintTokens(mintingSource, mintValue, {from:ownerMinter}).then(function(){
		return tokenContract.balanceOf(mintingSource).then(function(_endBalance){
			assert.equal(startingBalance + mintValue, _endBalance.toNumber(), "Target balance is not what expected!");
		return tokenContract.totalSupply.call().then(function(_endTotalSupply){
			assert.equal(startingTotalSupply + mintValue, _endTotalSupply.toNumber(), "Total supply was not set properly!")
		return tokenContract.mintTokens(mintingSource, mintValue, {from:notOwner}).then(function(){
			assert(false, "It should have thrown when user withouth permisions tries to mint tokens!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return Crowdsale.deployed().then(function(_crowdsaleInstance) {
			crowdsaleContract = _crowdsaleInstance;
		return tokenContract.bypassSetCrowdsaleAddress(crowdsaleContract.address).then(function() {
		return tokenContract.crowdsaleContractAddress.call().then(function(_crowdsaleAddy) {
			assert.equal(_crowdsaleAddy, crowdsaleContract.address, "Target balance is not what expected!");
		return tokenContract.bypassBurn(mintingSource, mintValue).then(function() {
		return tokenContract.balanceOf(mintingSource).then(function(_endBalance){
			assert.equal(0, _endBalance.toNumber(), "Did not clean after the deed :(!");
		return tokenContract.totalSupply.call().then(function(_endTotalSupply){
			assert.equal(0, _endTotalSupply.toNumber(), "Did not clean after the deed :(!")
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
	});

	it('Test transfer', function(){

		var tokenContract;
		var owner = web3.eth.accounts[0];
		var senderAccount = web3.eth.accounts[2];
		var recieverAccount = web3.eth.accounts[1];
		var transferValue = 50 * ETH;
		var fromStartBalance;
		var toStartBalance;
		var fromEndBalance;
		var toEndBalance;

		return Token.deployed().then(function(_tokenInstance) {
			tokenContract = _tokenInstance;
		return tokenContract.bypassMint(senderAccount, 100 * ETH, {from:owner}).then(function(){
		return tokenContract.bypassLockUntill(0).then(function(){
		return tokenContract.balanceOf(senderAccount).then(function(_fromStartBalance){
			assert.equal(_fromStartBalance.toNumber(), 100 * ETH, "There is not enough tokens to start the test!");
			fromStartBalance = _fromStartBalance.toNumber();
		return tokenContract.balanceOf(recieverAccount).then(function(_toStartBalance){
			toStartBalance = _toStartBalance.toNumber();
		return tokenContract.transfer(recieverAccount, transferValue, {from:senderAccount}).then(function(){
		return tokenContract.balanceOf(senderAccount).then(function(_fromEndBalance){
			assert.equal(fromStartBalance - transferValue, _fromEndBalance.toNumber(), "Source balance should not have changed!");
		return tokenContract.balanceOf(recieverAccount).then(function(_toEndBalance){
			assert.equal(toStartBalance + transferValue, _toEndBalance.toNumber(), "Destination balance should not have changed!");
		return tokenContract.transfer(recieverAccount, transferValue * 10, {from:senderAccount}).then(function(){
			assert(false, "It should have thrown when we want to send more that we have!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.transfer(0x0, transferValue, {from:senderAccount}).then(function(){
			assert(false, "It should have thrown when sending to 0x0!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.transfer(tokenContract.address, transferValue, {from:senderAccount}).then(function(){
			assert(false, "It should have thrown when sending to token contract address!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.transfer(senderAccount, transferValue, {from:recieverAccount}).then(function(){
		return tokenContract.balanceOf(senderAccount).then(function(_fromStartBalance){
			assert.equal(_fromStartBalance.toNumber(), 100 * ETH, "End state is not the same as start state");
		return tokenContract.bypassBurn(senderAccount, 100 * ETH).then(function() {
		return tokenContract.balanceOf(senderAccount).then(function(_endBalance){
			assert.equal(0, _endBalance.toNumber(), "Did not clean after the deed :(!");
		return tokenContract.totalSupply.call().then(function(_endTotalSupply){
			assert.equal(0, _endTotalSupply.toNumber(), "Did not clean after the deed :(!")
		return tokenContract.bypassLockUntill(100).then(function(){
		return tokenContract.lockedUntilBlock.call().then(function(_lockedUntill){
			assert.equal(100, _lockedUntill.toNumber(), "Did not clean after the deed :(!")
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
	});

	it('Test transferFrom', function(){

		var tokenContract;
		var owner = web3.eth.accounts[3];
		var fromAddy = web3.eth.accounts[2];
		var toAddy = web3.eth.accounts[1];
		var transferValue = 1337;
		var fromStartBalance;
		var toStartBalance;
		var fromEndBalance;
		var toEndBalance;

		return Token.deployed().then(function(_tokenInstance) {
			tokenContract = _tokenInstance;
		return tokenContract.bypassMint(fromAddy, 100 * ETH, {from:owner}).then(function(){
		return tokenContract.bypassLockUntill(0).then(function(){
		return tokenContract.balanceOf(fromAddy).then(function(_fromStartBalance){
			assert.equal(_fromStartBalance.toNumber(), 100 * ETH, "There is not enough tokens to start the test!");
			fromStartBalance = _fromStartBalance.toNumber();
		return tokenContract.balanceOf(toAddy).then(function(_toStartBalance){
			toStartBalance = _toStartBalance.toNumber()
		return tokenContract.approve(owner, transferValue * 2, {from:fromAddy}).then(function(){
		return tokenContract.transferFrom(fromAddy, toAddy, transferValue, {from:owner}).then(function(){
		return tokenContract.balanceOf(fromAddy).then(function(fromEndBal){
			assert.equal(fromStartBalance - transferValue, fromEndBal.toNumber(), "Source balance should have changed!");
		return tokenContract.balanceOf(toAddy).then(function(toEndBal){
			assert.equal(toStartBalance + transferValue, toEndBal.toNumber(), "Destination balance should have changed!");
		return tokenContract.transferFrom(fromAddy, toAddy, transferValue * 10, {from:owner}).then(function(){
			assert(false, "It should have thrown when we want to transferFrom more than allowance!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.transferFrom(fromAddy, 0x0, transferValue, {from:fromAddy}).then(function(){
			assert(false, "It should have thrown when sending to 0x0!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.transferFrom(fromAddy, tokenContract.address, transferValue, {from:fromAddy}).then(function(){
			assert(false, "It should have thrown when sending to token contract address!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.approve(owner, 200 * ETH, {from:fromAddy}).then(function(){
		return tokenContract.transferFrom(fromAddy, toAddy, 200 * ETH, {from:owner}).then(function(){
			assert(false, "It should have thrown when we want to transferFrom more than you have!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.transfer(fromAddy, transferValue, {from:toAddy}).then(function(){
		return tokenContract.balanceOf(fromAddy).then(function(_fromStartBalance){
			assert.equal(_fromStartBalance.toNumber(), 100 * ETH, "End state is not the same as start state");
		return tokenContract.bypassBurn(fromAddy, 100 * ETH).then(function() {
		return tokenContract.balanceOf(fromAddy).then(function(_endBalance){
			assert.equal(0, _endBalance.toNumber(), "Did not clean after the deed :(!");
		return tokenContract.totalSupply.call().then(function(_endTotalSupply){
			assert.equal(0, _endTotalSupply.toNumber(), "Did not clean after the deed :(!")
		return tokenContract.bypassLockUntill(100).then(function(){
		return tokenContract.lockedUntilBlock.call().then(function(_lockedUntill){
			assert.equal(100, _lockedUntill.toNumber(), "Did not clean after the deed :(!")
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
		});
	  });
		});
		});
		});
		});
  });

	it('Test approve', function(){

		var tokenContract;
		var approvee = web3.eth.accounts[2];
		var allowedAddy = web3.eth.accounts[6];
		var allowanceValue = 1337;

		return Token.deployed().then(function(_tokenInstance) {
			tokenContract = _tokenInstance;
		return tokenContract.approve(approvee, allowanceValue, {from:allowedAddy}).then(function(){
		return tokenContract.allowance(allowedAddy, approvee).then(function(allowedVal){
			assert.equal(allowanceValue, allowedVal.toNumber(), "Allowance is not set properly!");
		return tokenContract.approve(approvee, 0, {from:allowedAddy}).then(function(){
		return tokenContract.allowance(allowedAddy, approvee).then(function(allowedVal){
			assert.equal(0, allowedVal.toNumber(), "Allowance is not set properly!");
		});
		});
		});
		});
		});
	});

	it("Test lock", function(){

		var tokenContract;
		var owner = web3.eth.accounts[0];
		var sender = web3.eth.accounts[2];
		var reciever = web3.eth.accounts[8];
		var startFrozenBlockNumber;
		var blocksToFreezeFor = 9999999999999;

		return Token.deployed().then(function(_tokenInstance) {
			tokenContract = _tokenInstance;
		return tokenContract.approve(reciever, 10 * 10*18, {from:sender}).then(function(){
		return tokenContract.lockedUntilBlock.call().then(function(_startFrozenBlockNumber){
			startFrozenBlockNumber = _startFrozenBlockNumber;
		return tokenContract.lockUntil(blocksToFreezeFor, "bla", {from:owner}).then(function(){
		return tokenContract.lockedUntilBlock.call().then(function(_endFrozenBlockNumber){
			assert.equal(_endFrozenBlockNumber.toNumber(), blocksToFreezeFor, "Freeze block are not what expected!");
		return tokenContract.transfer(reciever, 10 * 10*18, {from:sender}).then(function(){
			assert(false, "It should have thrown when we want to transfer tokens while locked!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.approve(reciever, 10 * 10*18, {from:sender}).then(function(){
			assert(false, "It should have thrown when we want to approve while locked!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.transferFrom(sender, reciever, 10 * 10*18, {from:reciever}).then(function(){
			assert(false, "It should have thrown when we want to transferFrom while locked!")
		}).catch(function(_error) {
			if (_error.toString().indexOf("invalid opcode") == -1){ assert(false, _error.toString()); }
		return tokenContract.lockUntil(100, "bla", {from:owner}).then(function(){
		return tokenContract.approve(reciever, 0, {from:owner}).then(function(){
		});
		});
		});
		});
		});
		});
		});
		});
		});
	  });
  });

	it("Test ownership", function(){

		var tokenContract;
		var owner = web3.eth.accounts[0];
		var newOwner = web3.eth.accounts[2];
		var curentOwner;
		var curentNewOwner;

		return Token.deployed().then(function(_tokenInstance) {
			tokenContract = _tokenInstance;
		return tokenContract.transferOwnership(newOwner, {from:owner}).then(function(){
		return tokenContract.newOwner.call().then(function(_currNewOwner){
			assert.equal(newOwner, _currNewOwner, "New owner was not set properly!");
		return tokenContract.acceptOwnership({from:newOwner}).then(function(){
		return tokenContract.owner.call().then(function(_currOwner){
			assert.equal(newOwner, _currOwner, "New owner was not set properly!");
		return tokenContract.transferOwnership(owner, {from:newOwner}).then(function(){
		return tokenContract.acceptOwnership({from:owner}).then(function(){
		return tokenContract.owner.call().then(function(_currOwner){
			assert.equal(owner, _currOwner, "Did not clean after the deed :(!");
		});
		});
		});
		});
		});
		});
		});
		});
	});
});
