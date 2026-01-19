import { ethers } from "hardhat";

export async function setupGovernance() {
  const [deployer, proposer, voter1, voter2, recipient] =
    await ethers.getSigners();

  // deploy token
  const Token = await ethers.getContractFactory("DAOToken");
  const token = await Token.deploy();

  // mint voting power
  await token.mint(proposer.address, 1000);
  await token.mint(voter1.address, 800);
  await token.mint(voter2.address, 400);

  // deploy timelock
  const Timelock = await ethers.getContractFactory("DAOTimelock");
  const timelock = await Timelock.deploy(
    2 * 24 * 60 * 60,
    [],
    []
  );

  // deploy governance
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    token.address,
    timelock.address,
    1000, // 10% quorum
    100   // 1% proposal threshold
  );

  // deploy treasury
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(timelock.address);

  return {
    deployer,
    proposer,
    voter1,
    voter2,
    recipient,
    token,
    governance,
    timelock,
    treasury
  };
}
