const BigNumber = require("bignumber.js");
const ETH = Math.pow(10, 18);

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

  checkNumberMethod: function (contract, field, args, _expected) {
    const expected = new BigNumber(_expected);
    return () => Promise.resolve()
      .then(() => contract[field].call(...args))
      .then(_value => assert(expected.equals(_value), field + " was " + _value + ", expected " + expected));
  },

  checkNumberField: function (contract, field, _expected) {
    return module.exports.checkNumberMethod(contract, field, [], _expected);
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
  },
  
  computeCapsFromUSD: function(minUSD, maxUSD, _usdPerEth, _maxTokenSupply) {
    const maxTokenSupply = new BigNumber(_maxTokenSupply).times(ETH);
    const usdPerEth = new BigNumber(_usdPerEth);
    const minCapUSD = new BigNumber(minUSD);
    const maxCapUSD = new BigNumber(maxUSD);
    const maxCap = maxCapUSD.dividedBy(usdPerEth).times(ETH);
    const minCap = minCapUSD.dividedBy(usdPerEth).times(ETH);
    const tokensToSell = maxTokenSupply.dividedBy(4);
    const tokensPerETH = tokensToSell.dividedBy(maxCap);
    const ethPerToken = new BigNumber(1).dividedBy(tokensPerETH);
    const usdPerToken = ethPerToken.times(usdPerEth);

    return {
      maxTokenSupply: maxTokenSupply,
      usdPerEth: usdPerEth,
      minCapUSD: minCapUSD,
      maxCapUSD: maxCapUSD,
      minCap: minCap,
      maxCap: maxCap,
      tokensToSell: tokensToSell,
      tokensPerETH: tokensPerETH,
      ethPerToken: ethPerToken,
      usdPerToken: usdPerToken,
    }
  },

  computeCapsFromETH: function(minETH, maxETH, _maxTokenSupply) {
    const maxTokenSupply = new BigNumber(_maxTokenSupply).times(ETH);
    const minCap = new BigNumber(minETH).times(ETH);
    const maxCap = new BigNumber(maxETH).times(ETH);
    const tokensToSell = maxTokenSupply.dividedBy(4);
    const tokensPerETH = tokensToSell.dividedBy(maxCap);
    const ethPerToken = new BigNumber(1).dividedBy(tokensPerETH);

    return {
      maxTokenSupply: maxTokenSupply,
      minCap: minCap,
      maxCap: maxCap,
      tokensToSell: tokensToSell,
      tokensPerETH: tokensPerETH,
      ethPerToken: ethPerToken,
    }
  }
};