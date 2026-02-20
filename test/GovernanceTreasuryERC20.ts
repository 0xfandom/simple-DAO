import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

describe("Governance → Treasury ERC20 transfers", function () {
  let token: any;
  let governance: any;
  let timelock: any;
  let executor: any;
  let treasury: any;
  let erc20: any;

  let deployer: any;
  let alice: any;
  let recipient: any;

  beforeEach(async () => {
    [deployer, alice, recipient] = await ethers.getSigners();

    // Governance token
    const GovToken = await ethers.getContractFactory("DAOToken");
    token = await GovToken.deploy();
    await token.waitForDeployment();

    // ERC20 to be held by treasury
    const ERC20 = await ethers.getContractFactory("MockERC20");
    erc20 = await ERC20.deploy("Mock Token", "MOCK", 18);
    await erc20.waitForDeployment();

    // Timelock
    const Timelock = await ethers.getContractFactory("DAOTimelock");
    timelock = await Timelock.deploy(2 * 24 * 60 * 60, [], []);
    await timelock.waitForDeployment();

    // Governance
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(
      await token.getAddress(),
      1000,
      await timelock.getAddress()
    );
    await governance.waitForDeployment();

    // Executor
    const Executor = await ethers.getContractFactory("Executor");
    executor = await Executor.deploy(await governance.getAddress());
    await executor.waitForDeployment();

    // Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await executor.getAddress());
    await treasury.waitForDeployment();

    // Roles
    await timelock.grantRole(
      await timelock.PROPOSER_ROLE(),
      await governance.getAddress()
    );
    await timelock.grantRole(
      await timelock.EXECUTOR_ROLE(),
      await executor.getAddress()
    );

    // Voting power
    await token.mint(alice.address, 100);

    // Fund treasury with ERC20
    await erc20.mint(await treasury.getAddress(), 1_000);
  });

  it("executes ERC20 transfer from treasury via governance proposal", async () => {
    const amount = 250;

    // Encode Treasury.transferERC20(...)
    const data = treasury.interface.encodeFunctionData(
      "transferERC20",
      [
        await erc20.getAddress(),
        recipient.address,
        amount
      ]
    );

    // Propose
    await governance
      .connect(alice)
      .propose(await treasury.getAddress(), 0, data);

    await time.advanceBlock();

    // Vote
    await governance.connect(alice).vote(1, true);

    // End voting
    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    // Queue
    await governance.queueProposal(1);

    // Timelock delay
    await time.increase(await timelock.getMinDelay());

    // Execute
    await executor.executeQueued(1);

    expect(await erc20.balanceOf(recipient.address)).to.equal(amount);
  });
});
