// scripts/deploy_router.js
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());

  const AddressRouter = await hre.ethers.getContractFactory('AddressRouter');
  const router = await AddressRouter.deploy();
  await router.waitForDeployment();

  const addr = await router.getAddress();
  console.log('AddressRouter deployed at:', addr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
