const hre = require("hardhat");
const { deployLib } = require("./deploy_libs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const gasPrice =
    (await hre.ethers.provider.getFeeData()).gasPrice ??
    hre.ethers.toBigInt("10000000000000");

  const libAddr = await deployLib();

  const Chat = await hre.ethers.getContractFactory("ChatRegistry", {
    libraries: {
      "@biomapper-sdk/libraries/BiomapperLogLib.sol:BiomapperLogLib": libAddr,
    },
  });

  const chat = await Chat.deploy({
    type: 0,
    gasPrice,
    gasLimit: 1_400_000,
  });

  console.log("ChatRegistry tx:", chat.deploymentTransaction().hash);
  await chat.waitForDeployment();
  console.log("ChatRegistry at:", await chat.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
