// hardhat.config.js
require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

const {
  PRIVATE_KEY,
  // Canonical (preferred)
  HUMANODE_RPC_URL,
  // Fallbacks (accept any of these if set)
  Humanode_RPC_URL,
  RPC_URL,
  NEXT_PUBLIC_RPC_URL, // last resort, only if you intentionally reuse it
} = process.env;

const URL = HUMANODE_RPC_URL || Humanode_RPC_URL || RPC_URL || NEXT_PUBLIC_RPC_URL || '';

if (!URL) {
  console.warn(
    '⚠️  No RPC URL set. Define HUMANODE_RPC_URL in your root .env (or one of the accepted fallbacks).'
  );
}

module.exports = {
  solidity: {
    version: '0.8.26',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    humanode_testnet5: {
      chainId: 14853,
      url: URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
