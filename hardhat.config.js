const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('@nomicfoundation/hardhat-toolbox');

const HUMANODE_RPC_URL = process.env.HUMANODE_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.26',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    ...(HUMANODE_RPC_URL && PRIVATE_KEY
      ? {
          humanode: {
            url: HUMANODE_RPC_URL,
            chainId: 14853,
            accounts: [PRIVATE_KEY],
            // Use number or string (NOT BigInt)
            gasPrice: 10000000000000, // 10_000 gwei
            // gasPrice: "10000000000000", // also ok
          },
        }
      : {}),
  },
};
