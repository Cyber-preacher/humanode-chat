require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const HUMANODE_RPC = process.env.HUMANODE_RPC_URL;   // e.g. https://explorer-rpc-http.testnet5.stages.humanode.io
const PRIVATE_KEY = process.env.PRIVATE_KEY;        // 0x...

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
    solidity: {
        version: "0.8.26",
        settings: { optimizer: { enabled: true, runs: 200 } },
    },
    networks: {
        // add localhost or hardhat if you want, they don’t need env
        ...(HUMANODE_RPC && PRIVATE_KEY
            ? {
                humanode: {
                    url: HUMANODE_RPC,
                    chainId: 14853,
                    accounts: [PRIVATE_KEY],
                    gasPrice: 10_000n * 10n ** 9n, // 10k gwei (optional)
                },
            }
            : {}),
    },
};

module.exports = config;
