import { expect } from "chai";
import { ethers } from "hardhat";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";

import { setupGovernance } from "./helpers/governanceSetup.js";

describe("Governance → Treasury execution flow", function () {
  it("executes full governance flow for ETH transfer", async function () {
    const {
      proposer,
      voter1,
      voter2,
      recipient,
      governance,
      treasury,
    } = await setupGovernance();

    // Fund Treasury with 1 ETH
    await proposer.sendTransaction({
      to: treasury.address,
      value: ethers.parseEther("1"), // ethers.utils.parseEther if v5
    });

    // Encode Treasury call
    const transferAmount = ethers.parseEther("0.5");
    const data = treasury.interface.encodeFunctionData(
      "transferETH",
      [recipient.address, transferAmount]
    );

    // Create proposal
    await governance
      .connect(proposer)
      .propose(treasury.address, transferAmount, data);

    // Move into voting period
    await mine(5);

    // Vote
    await governance.connect(voter1).vote(1, true);
    await governance.connect(voter2).vote(1, true);

    // Queue proposal
    await governance.queue(1);

    // Advance timelock (2 days)
    await time.increase(2 * 24 * 60 * 60);

    // Execute proposal
    await governance.execute(1);

    // Assert ETH transferred
    const recipientBalance = await ethers.provider.getBalance(
      recipient.address
    );

    expect(recipientBalance).to.equal(transferAmount);
  });
});
