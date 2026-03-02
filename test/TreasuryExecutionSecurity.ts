import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

describe("Treasury — replay & double execution protection", function () {
  let token: any;
  let governance: any;
  let timelock: any;
  let executor: any;
  let treasury: any;

  let deployer: any;
  let proposer: any;
  let recipient: any;

  beforeEach(async () => {
    [deployer, proposer, recipient] = await ethers.getSigners();

    // Deploy token
    const DAOToken = await ethers.getContractFactory("DAOToken");
    token = await DAOToken.deploy();
    await token.waitForDeployment();

    await token.mint(proposer.address, 1000);

    // Deploy timelock
    const Timelock = await ethers.getContractFactory("DAOTimelock");
    timelock = await Timelock.deploy(2 * 24 * 60 * 60, [], []);
    await timelock.waitForDeployment();

    // Deploy governance
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(
      await token.getAddress(),
      1000,
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
      value: ethers.parseEther("2"),
    });

    // Setup timelock roles
    await timelock.grantRole(
      await timelock.PROPOSER_ROLE(),
      await governance.getAddress()
    );

    await timelock.grantRole(
      await timelock.EXECUTOR_ROLE(),
      await executor.getAddress()
    );
  });

  it("❌ prevents treasury double execution (replay attack)", async () => {
    const amount = ethers.parseEther("0.5");

    const data = treasury.interface.encodeFunctionData(
      "transferETH",
      [recipient.address, amount]
    );

    // Create proposal
    await governance
      .connect(proposer)
      .propose(await treasury.getAddress(), 0, data);

    await time.advanceBlock();

    // Vote
    await governance.connect(proposer).vote(1, true);

    // End voting
    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    // Queue proposal
    await governance.queueProposal(1);

    // Wait timelock delay
    await time.increase(await timelock.getMinDelay());

    // First execution should succeed
    await executor.executeQueued(1);

    // Second execution must fail
    await expect(
      executor.executeQueued(1)
    ).to.be.revertedWith("already executed");
  });
});