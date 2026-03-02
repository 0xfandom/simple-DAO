import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

describe("Treasury — Reentrancy protection", function () {
  let token: any;
  let governance: any;
  let timelock: any;
  let executor: any;
  let treasury: any;
  let reenter: any;

  let deployer: any;
  let proposer: any;

  beforeEach(async () => {
    [deployer, proposer] = await ethers.getSigners();

    // Deploy governance token
    const DAOToken = await ethers.getContractFactory("DAOToken");
    token = await DAOToken.deploy();
    await token.waitForDeployment();

    await token.mint(proposer.address, 1_000);

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

    // Deploy treasury (must use ReentrancyGuard)
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await executor.getAddress());
    await treasury.waitForDeployment();

    // Fund treasury
    await deployer.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("5"),
    });

    // Deploy malicious contract
    const Reenter = await ethers.getContractFactory("Reenter");
    reenter = await Reenter.deploy(await treasury.getAddress());
    await reenter.waitForDeployment();

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

  it("❌ blocks reentrancy attack via malicious contract", async () => {
    const attackAmount = ethers.parseEther("1");

    const data = treasury.interface.encodeFunctionData(
      "transferETH",
      [await reenter.getAddress(), attackAmount]
    );

    // Propose malicious transfer
    await governance
      .connect(proposer)
      .propose(await treasury.getAddress(), 0, data);

    await time.advanceBlock();

    await governance.connect(proposer).vote(1, true);

    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    await governance.queueProposal(1);

    await time.increase(await timelock.getMinDelay());

    // Execution should revert due to ReentrancyGuard
    await expect(
      executor.executeQueued(1)
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });
});