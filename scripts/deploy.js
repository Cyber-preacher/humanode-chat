const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Balance:', hre.ethers.formatEther(bal), 'eHMND');

  // Use node's fee data
  const fd = await hre.ethers.provider.getFeeData();
  // Fallback to the value you saw (10,000 gwei) if null
  const gasPrice = fd.gasPrice ?? hre.ethers.toBigInt('10000000000000');

  console.log('Using gasPrice:', gasPrice.toString());

  // Sanity ping with correct gasPrice
  const ping = await deployer.sendTransaction({
    to: deployer.address,
    value: 0,
    type: 0,
    gasPrice,
    gasLimit: 21000,
  });
  console.log('Ping tx:', ping.hash);
  await ping.wait();
  console.log('Ping confirmed');

  // Raw deploy with explicit params (no estimation)
  const artifact = await hre.artifacts.readArtifact('Counter');
  const createTx = await deployer.sendTransaction({
    to: undefined,
    data: artifact.bytecode,
    value: 0,
    type: 0,
    gasPrice,
    gasLimit: 1200000, // ~1.2M; plenty for this contract
  });
  console.log('Deploy tx:', createTx.hash);
  const rcpt = await createTx.wait();
  console.log('Deployed at:', rcpt.contractAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
