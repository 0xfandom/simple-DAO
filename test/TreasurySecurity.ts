import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

describe("Treasury security restrictions", function () {
  let token: any;
  let governance: any;
  let timelock: any;
  let executor: any;
  let treasury: any;

  let deployer: any;
  let alice: any;
  let recipient: any;

  beforeEach(async () => {
    [deployer, alice, recipient] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("DAOToken");
    token = await Token.deploy();
    await token.waitForDeployment();

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

    // Deploy treasury (executor-only)
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await executor.getAddress());
    await treasury.waitForDeployment();

    // Setup roles
    await timelock.grantRole(
      await timelock.PROPOSER_ROLE(),
      await governance.getAddress()
    );
    await timelock.grantRole(
      await timelock.EXECUTOR_ROLE(),
      await executor.getAddress()
    );

    // Mint voting power
    await token.mint(alice.address, 100);

    // Fund treasury
    await deployer.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("1"),
    });
  });

  it("EOA cannot transfer ETH from treasury", async () => {
    const amount = ethers.parseEther("0.1");

    await expect(
      treasury.connect(alice).transferETH(recipient.address, amount)
    ).to.be.revertedWith("not executor");
  });

  it("Governance cannot bypass timelock and call treasury directly", async () => {
    const amount = ethers.parseEther("0.1");

    await expect(
      treasury
        .connect(governance)
        .transferETH(recipient.address, amount)
    ).to.be.revertedWith("not executor");
  });

  it("Treasury transfer succeeds only via timelock execution", async () => {
    const amount = ethers.parseEther("0.2");

    // Encode Treasury.transferETH
    const data = treasury.interface.encodeFunctionData(
      "transferETH",
      [recipient.address, amount]
    );

    // Create proposal
    await governance
      .connect(alice)
      .propose(await treasury.getAddress(), 0, data);

    await time.advanceBlock();

    // Vote
    await governance.connect(alice).vote(1, true);

    // End voting
    const proposal = await governance.getProposal(1);
    await time.advanceBlockTo(Number(proposal.endBlock) + 1);

    // Queue proposal
    await governance.queueProposal(1);

    // Wait for timelock
    await time.increase(await timelock.getMinDelay());

    const before = await ethers.provider.getBalance(recipient.address);

    // Execute via executor
    await executor.executeQueued(1);

    const after = await ethers.provider.getBalance(recipient.address);

    expect(after - before).to.equal(amount);
  });
});
