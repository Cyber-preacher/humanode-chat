const hre = require("hardhat");

async function deployLib() {
  const [deployer] = await hre.ethers.getSigners();
  const gasPrice =
    (await hre.ethers.provider.getFeeData()).gasPrice ??
    hre.ethers.toBigInt("10000000000000"); // 10 000 gwei

  const LibFactory = await hre.ethers.getContractFactory("BiomapperLogLib");
  const lib = await LibFactory.deploy({ type: 0, gasPrice, gasLimit: 800_000 });
  console.log("BiomapperLogLib tx:", lib.deploymentTransaction().hash);
  await lib.waitForDeployment();
  const addr = await lib.getAddress();
  console.log("BiomapperLogLib at:", addr);
  return addr;
}

module.exports = { deployLib };
