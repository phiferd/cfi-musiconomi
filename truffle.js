module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8546,
      network_id: "*" // Match any network id
    }
  },
  coverage: {
    host: "localhost",
    network_id: "*",
    port: 8546,         // <-- If you change this, also set the port option in .solcover.js.
    gas: 0xfffffffffff, // <-- Use this high gas value
    gasPrice: 0x01      // <-- Use this low gas price
  },
};
