import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

describe("Governance + Timelock execution", function () {
  let token: any;
  let timelock: any;
  let governance: any;
  let executor: any;

  let alice: any;
  let bob: any;

  const QUORUM_BPS = 1000; // 10%

  beforeEach(async () => {
    [alice, bob] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("DAOToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    // Deploy timelock (example: 2 days delay)
    const Timelock = await ethers.getContractFactory("DAOTimelock");
    timelock = await Timelock.deploy(
      2 * 24 * 60 * 60, // minDelay
      [], // proposers
      []  // executors
    );
    await timelock.waitForDeployment();

    // Deploy governance
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(
      await token.getAddress(),
      QUORUM_BPS,
      await timelock.getAddress()
    );
    await governance.waitForDeployment();

    // Deploy executor
    const Executor = await ethers.getContractFactory("Executor");
    executor = await Executor.deploy(await governance.getAddress());
    await executor.waitForDeployment();

    // Setup roles
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, await governance.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE, await executor.getAddress());

    // Mint voting power
    await token.mint(alice.address, 100);
    await token.mint(bob.address, 100);
  });

  async function createAndQueueProposal() {
    const iface = new ethers.Interface(["function dummy()"]);

    // Alice proposes
    await governance
      .connect(alice)
      .propose(alice.address, 0, iface.encodeFunctionData("dummy"));

    // Advance block so snapshot is valid
    await time.advanceBlock();

    // Vote
    await governance.connect(alice).vote(1, true);
    await governance.connect(bob).vote(1, true);

    // End voting
    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    // Queue proposal
    await governance.queueProposal(1);
  }

  it("cannot execute proposal immediately after queue", async () => {
    await createAndQueueProposal();

    await expect(
      executor.executeQueued(1)
    ).to.be.reverted; // Timelock not expired
  });

  it("executes proposal after timelock delay", async () => {
    await createAndQueueProposal();

    const delay = await timelock.getMinDelay();
    await time.increase(delay.toNumber() + 1);

    await expect(
      executor.executeQueued(1)
    ).to.not.be.reverted;

    const proposal = await governance.getProposal(1);
    expect(proposal.executed).to.equal(true);
  });

  it("cannot execute proposal twice", async () => {
    await createAndQueueProposal();

    const delay = await timelock.getMinDelay();
    await time.increase(delay.toNumber() + 1);

    await executor.executeQueued(1);

    await expect(
      executor.executeQueued(1)
    ).to.be.revertedWith("already executed");
  });
});
