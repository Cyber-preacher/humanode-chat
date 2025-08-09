require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const OUT_FILE = path.join("deployments", "humanode-14853.json");
const CHAIN_ID = 14853;

function mergeWrite(partial) {
  const prev = fs.existsSync(OUT_FILE)
    ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8"))
    : {};
  const next = { ...prev, ...partial };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(next, null, 2));
  console.log(`📦 wrote ${OUT_FILE}\n`, next);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy Router (adjust name/constructor if your contract differs)
  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy();
  const receipt = await router.deploymentTransaction().wait();
  console.log("Router tx:", receipt.hash);
  console.log("Router at:", await router.getAddress());

  mergeWrite({
    chainId: CHAIN_ID,
    Router: await router.getAddress(),
  });

  // Generate frontend addresses.json
  await require("child_process").execSync("pnpm run sync:addresses", { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
