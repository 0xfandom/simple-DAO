import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

describe("Governance — proposal threshold enforcement", function () {
  let token: any;
  let governance: any;
  let timelock: any;

  let deployer: any;
  let user: any;
  let whale: any;
  let target: any;

  beforeEach(async () => {
    [deployer, user, whale, target] = await ethers.getSigners();

    // Deploy governance token
    const DAOToken = await ethers.getContractFactory("DAOToken");
    token = await DAOToken.deploy();
    await token.waitForDeployment();

    // Deploy timelock
    const Timelock = await ethers.getContractFactory("DAOTimelock");
    timelock = await Timelock.deploy(2 * 24 * 60 * 60, [], []);
    await timelock.waitForDeployment();

    // Deploy governance
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(
      await token.getAddress(),
      1000, // quorum = 10%
      await timelock.getAddress()
    );
    await governance.waitForDeployment();
  });

  it("❌ reverts when proposer is below proposal threshold", async () => {
    // User has small balance
    await token.mint(user.address, 5);

    const data = "0x";

    await expect(
      governance
        .connect(user)
        .propose(target.address, 0, data)
    ).to.be.revertedWith("proposal threshold not met");
  });

  it("✅ allows proposal when proposer meets threshold", async () => {
    // Whale has enough voting power
    await token.mint(whale.address, 1_000);

    const data = "0x";

    await governance
      .connect(whale)
      .propose(target.address, 0, data);

    expect(await governance.proposalCount()).to.equal(1);
  });

  it("❌ transferring tokens after snapshot does NOT affect proposal eligibility", async () => {
    // Whale initially meets threshold
    await token.mint(whale.address, 1_000);

    // Create snapshot boundary
    await time.advanceBlock();

    // Transfer tokens away AFTER snapshot
    await token.connect(whale).transfer(user.address, 900);

    const data = "0x";

    // Proposal should still succeed
    await governance
      .connect(whale)
      .propose(target.address, 0, data);

    expect(await governance.proposalCount()).to.equal(1);
  });
});
