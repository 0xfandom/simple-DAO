import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

describe("Governance — failure flow scenarios", function () {
  let token: any;
  let governance: any;
  let timelock: any;
  let executor: any;
  let treasury: any;

  let deployer: any;
  let proposer: any;
  let voter: any;
  let recipient: any;

  beforeEach(async () => {
    [deployer, proposer, voter, recipient] = await ethers.getSigners();

    // Deploy governance token
    const DAOToken = await ethers.getContractFactory("DAOToken");
    token = await DAOToken.deploy();
    await token.waitForDeployment();

    // Mint voting power
    await token.mint(proposer.address, 100);
    await token.mint(voter.address, 50);

    // Deploy timelock
    const Timelock = await ethers.getContractFactory("DAOTimelock");
    timelock = await Timelock.deploy(2 * 24 * 60 * 60, [], []);
    await timelock.waitForDeployment();

    // Deploy governance
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(
      await token.getAddress(),
      1000, // 10% quorum
      await timelock.getAddress()
    );
    await governance.waitForDeployment();

    // Deploy executor
    const Executor = await ethers.getContractFactory("Executor");
    executor = await Executor.deploy(await governance.getAddress());
    await executor.waitForDeployment();

    // Deploy treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await executor.getAddress());
    await treasury.waitForDeployment();

    // Fund treasury
    await deployer.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("1"),
    });

    // Assign timelock roles
    await timelock.grantRole(
      await timelock.PROPOSER_ROLE(),
      await governance.getAddress()
    );
    await timelock.grantRole(
      await timelock.EXECUTOR_ROLE(),
      await executor.getAddress()
    );
  });

  it("❌ reverts queue when quorum not reached", async () => {
    const data = "0x";

    // Propose
    await governance
      .connect(proposer)
      .propose(recipient.address, 0, data);

    await time.advanceBlock();

    // Vote but below quorum threshold
    await governance.connect(proposer).vote(1, true);

    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    // Attempt to queue
    await expect(
      governance.queueProposal(1)
    ).to.be.revertedWith("quorum not reached");
  });

  it("❌ cannot execute before timelock delay", async () => {
    const amount = ethers.parseEther("0.1");

    const data = treasury.interface.encodeFunctionData(
      "transferETH",
      [recipient.address, amount]
    );

    // Propose
    await governance
      .connect(proposer)
      .propose(await treasury.getAddress(), 0, data);

    await time.advanceBlock();

    await governance.connect(proposer).vote(1, true);

    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    await governance.queueProposal(1);

    // Try executing immediately (no delay)
    await expect(
      executor.executeQueued(1)
    ).to.be.reverted; // Timelock should revert
  });

  it("❌ prevents double execution", async () => {
    const amount = ethers.parseEther("0.1");

    const data = treasury.interface.encodeFunctionData(
      "transferETH",
      [recipient.address, amount]
    );

    await governance
      .connect(proposer)
      .propose(await treasury.getAddress(), 0, data);

    await time.advanceBlock();

    await governance.connect(proposer).vote(1, true);

    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    await governance.queueProposal(1);

    await time.increase(await timelock.getMinDelay());

    // First execution succeeds
    await executor.executeQueued(1);

    // Second execution must revert
    await expect(
      executor.executeQueued(1)
    ).to.be.revertedWith("already executed");
  });
});