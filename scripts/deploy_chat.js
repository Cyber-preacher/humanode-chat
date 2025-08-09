/* scripts/deploy_chat.js */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const DEPLOY_FILE = path.join(__dirname, "..", "deployments", "humanode-testnet5.json");

function upsertAddress(key, value) {
  let db = {};
  try {
    db = JSON.parse(fs.readFileSync(DEPLOY_FILE, "utf8"));
  } catch (_) {}
  db[key] = value;
  fs.mkdirSync(path.dirname(DEPLOY_FILE), { recursive: true });
  fs.writeFileSync(DEPLOY_FILE, JSON.stringify(db, null, 2));
  console.log(`➜ Wrote ${key}: ${value} to ${DEPLOY_FILE}`);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  // 1) Deploy the Biomapper library
  const BioLibFactory = await hre.ethers.getContractFactory("BiomapperLogLib");
  const bioLib = await BioLibFactory.deploy();
  await bioLib.waitForDeployment();
  const bioLibAddr = await bioLib.getAddress();
  console.log("BiomapperLogLib at:", bioLibAddr);

  // 2) Link it for ChatRegistry
  const ChatFactory = await hre.ethers.getContractFactory("ChatRegistry", {
    libraries: {
      "@biomapper-sdk/libraries/BiomapperLogLib.sol:BiomapperLogLib": bioLibAddr,
    },
  });

  const chat = await ChatFactory.deploy();
  await chat.waitForDeployment();
  const chatAddr = await chat.getAddress();
  console.log("ChatRegistry at:", chatAddr);

  // 3) Persist
  upsertAddress("ChatRegistry", chatAddr);
  upsertAddress("BiomapperLogLib", bioLibAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
