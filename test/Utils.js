module.exports = {
  printBalance: function(text, address) {
    return () => Promise.resolve()
      .then(() => web3.eth.getBalance(address))
      .then(a => console.log(text + ": " + a));
  },

  contribute: function (contract, sender, value) {
    return () => Promise.resolve()
      .then(() => contract.sendTransaction({from: sender, value: value, gas: 940000}))
  },

  checkNumberMethod: function (contract, field, args, expected) {
    return () => Promise.resolve()
      .then(() => contract[field].call(...args))
      .then(_value => assert.equal(expected, _value.toNumber(), field + " was " + _value + ", expected " + expected));
  },

  checkNumberField: function (contract, field, expected) {
    return () => Promise.resolve()
      .then(() => contract[field].call())
      .then(_value => assert.equal(expected, _value.toNumber(), field + " was " + _value + ", expected " + expected));
  },

  checkField: function (contract, field, expected) {
    return () => Promise.resolve()
      .then(() => contract[field].call())
      .then(_value => assert.equal(expected, _value, field + " was " + _value + ", expected " + expected));
  },

  assertInvalidOp: function (p) {
    return p
      .then(() => assert(false, "It should have failed"))
      .catch(_error => assert(_error.toString().indexOf("invalid opcode") !== -1, _error.toString()))
  },

  // Dummy method that will advance through the blocks.  TestRPC has some methods that are supposed to do this
  // automatically, but they don't seem to work very well.
  waitUntilBlock: function (crowdsaleContract, block, crowdsaleOwner) {
    return Promise.resolve()
      .then(() => crowdsaleContract.getBlockNumber())
      .then((_currentBlock) => {
        if (_currentBlock.toNumber() >= block) {
          return true;
        }
        else {
          console.log("Waiting for block " + block + ", at block " + _currentBlock);
          return Promise.resolve()
            .then(() => crowdsaleContract.multisigAddress.call())
            .then((_address) => crowdsaleContract.setMultisigAddress(_address, {from: crowdsaleOwner}))
            .then(() => module.exports.waitUntilBlock(crowdsaleContract, block, crowdsaleOwner))
        }
      })
  }
};