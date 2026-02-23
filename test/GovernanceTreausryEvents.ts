import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

describe("Governance & Treasury — Event Emission", function () {
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

    // Mint voting power
    await token.mint(proposer.address, 1_000);

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

    // Timelock roles
    await timelock.grantRole(
      await timelock.PROPOSER_ROLE(),
      await governance.getAddress()
    );
    await timelock.grantRole(
      await timelock.EXECUTOR_ROLE(),
      await executor.getAddress()
    );
  });

  it("✅ emits VoteCast event with correct args", async () => {
    const data = "0x";

    await governance
      .connect(proposer)
      .propose(recipient.address, 0, data);

    await time.advanceBlock();

    const votes = await token.getPastVotes(
      proposer.address,
      (await governance.getProposal(1)).snapshotBlock
    );

    await expect(
      governance.connect(proposer).vote(1, true)
    )
      .to.emit(governance, "VoteCast")
      .withArgs(proposer.address, 1, true, votes);
  });

  it("✅ emits treasury ETHTransferred event on execution", async () => {
    const amount = ethers.parseEther("0.1");

    const data = treasury.interface.encodeFunctionData(
      "transferETH",
      [recipient.address, amount]
    );

    // Propose treasury transfer
    await governance
      .connect(proposer)
      .propose(await treasury.getAddress(), amount, data);

    await time.advanceBlock();

    await governance.connect(proposer).vote(1, true);

    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    // Queue proposal
    await governance.queueProposal(1);

    // Wait for timelock
    await time.increase(await timelock.getMinDelay());

    // Execute + assert event
    await expect(
      executor.executeQueued(1)
    )
      .to.emit(treasury, "ETHTransferred")
      .withArgs(recipient.address, amount);
  });
});
