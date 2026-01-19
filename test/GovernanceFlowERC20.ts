import { expect } from "chai";
import { ethers } from "hardhat";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";

import { setupGovernance } from "./helpers/governanceSetup.js";

describe("Governance → Treasury execution flow", function () {
  it("executes full governance flow for ERC20 transfer", async function () {
    const {
      proposer,
      voter1,
      token,
      governance,
      treasury,
      recipient,
    } = await setupGovernance();

    // Mint ERC20 tokens to Treasury
    await token.mint(treasury.address, 500);

    // Encode Treasury ERC20 transfer call
    const data = treasury.interface.encodeFunctionData(
      "transferERC20",
      [token.address, recipient.address, 200]
    );

    // Create proposal
    await governance
      .connect(proposer)
      .propose(treasury.address, 0, data);

    // Move into voting period
    await mine(5);

    // Vote
    await governance.connect(voter1).vote(1, true);

    // Queue proposal
    await governance.queue(1);

    // Advance timelock (2 days)
    await time.increase(2 * 24 * 60 * 60);

    // Execute proposal
    await governance.execute(1);

    // Assert ERC20 transferred
    const recipientBalance = await token.balanceOf(recipient.address);
    expect(recipientBalance).to.equal(200);
  });
});
