require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const { RPC, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    humanode: {
      url: RPC,
      chainId: 14853,
      gasPrice: 1_000_000_000, // 1 gwei
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      timeout: 120000,
    },
  },
};
