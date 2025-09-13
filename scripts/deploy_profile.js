/* scripts/deploy_profile.js */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

const DEPLOY_FILE = path.join(__dirname, '..', 'deployments', 'humanode-testnet5.json');

function upsertAddress(key, value) {
  let db = {};
  try {
    db = JSON.parse(fs.readFileSync(DEPLOY_FILE, 'utf8'));
  } catch (_) {}
  db[key] = value;
  fs.mkdirSync(path.dirname(DEPLOY_FILE), { recursive: true });
  fs.writeFileSync(DEPLOY_FILE, JSON.stringify(db, null, 2));
  console.log(`➜ Wrote ${key}: ${value} to ${DEPLOY_FILE}`);
}

// Build the correct { "<sourcePath>:BiomapperLogLib": address } map dynamically
async function libMapFor(contractName, libName, libAddress) {
  const art = await hre.artifacts.readArtifact(contractName);
  const links = art.linkReferences || {};
  const map = {};
  for (const [sourcePath, libs] of Object.entries(links)) {
    for (const name of Object.keys(libs)) {
      if (name === libName) {
        const fq = `${sourcePath}:${name}`;
        map[fq] = libAddress;
      }
    }
  }
  if (Object.keys(map).length === 0) {
    console.log(
      `[warn] No linkReferences found for ${libName} in ${contractName}. Printing link refs for debug:`,
    );
    console.log(links);
  } else {
    console.log(`[info] Linking ${contractName} with:`, map);
  }
  return map;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());

  // 1) Deploy BiomapperLogLib
  const BioLibFactory = await hre.ethers.getContractFactory('BiomapperLogLib');
  const bioLib = await BioLibFactory.deploy();
  await bioLib.waitForDeployment();
  const bioLibAddr = await bioLib.getAddress();
  console.log('BiomapperLogLib at:', bioLibAddr);

  // 2) Create factory for ProfileRegistry with the dynamically discovered FQN
  const libraries = await libMapFor('ProfileRegistry', 'BiomapperLogLib', bioLibAddr);
  const ProfileFactory = await hre.ethers.getContractFactory('ProfileRegistry', { libraries });

  const profile = await ProfileFactory.deploy();
  await profile.waitForDeployment();
  const profileAddr = await profile.getAddress();
  console.log('ProfileRegistry at:', profileAddr);

  // 3) Persist
  upsertAddress('BiomapperLogLib', bioLibAddr);
  upsertAddress('ProfileRegistry', profileAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
