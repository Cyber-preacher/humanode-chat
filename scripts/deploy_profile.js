const hre = require("hardhat");
const { deployLib } = require("./deploy_libs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const gasPrice =
    (await hre.ethers.provider.getFeeData()).gasPrice ??
    hre.ethers.toBigInt("10000000000000");

  // 1) deploy the library
  const libAddr = await deployLib();

  // 2) link library when creating the factory
  const Profile = await hre.ethers.getContractFactory("ProfileRegistry", {
    libraries: {
      "@biomapper-sdk/libraries/BiomapperLogLib.sol:BiomapperLogLib": libAddr,
    },
  });

  const profile = await Profile.deploy({
    type: 0,
    gasPrice,
    gasLimit: 1_400_000,
  });

  console.log("ProfileRegistry tx:", profile.deploymentTransaction().hash);
  await profile.waitForDeployment();
  console.log("ProfileRegistry at:", await profile.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
