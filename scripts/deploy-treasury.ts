import { ethers } from "hardhat";

async function main() {
  // 👉 Replace this with your Timelock / Executor address
  const EXECUTOR_ADDRESS = "";

  if (!ethers.isAddress(EXECUTOR_ADDRESS)) {
    throw new Error("Invalid executor address");
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying Treasury with account:", deployer.address);
  console.log("Executor address:", EXECUTOR_ADDRESS);
  console.log(
    "Deployer balance:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );

  const Treasury = await ethers.getContractFactory("Treasury");

  const treasury = await Treasury.deploy(EXECUTOR_ADDRESS);
  await treasury.waitForDeployment();

  const treasuryAddress = await treasury.getAddress();

  console.log("✅ Treasury deployed at:", treasuryAddress);
  console.log("Executor set to:", await treasury.executor());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
