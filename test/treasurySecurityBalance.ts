import { expect } from "chai";
import { ethers } from "hardhat";

import { setupGovernance } from "./helpers/governanceSetup.js";

describe("Executor → Execution failure cases", function () {
  it("reverts if ETH balance is insufficient", async function () {
    const {
      proposer,
      governance,
      executor,
      treasury,
      recipient,
    } = await setupGovernance();

    const amount = ethers.utils.parseEther("1");

    // create proposal without funding treasury
    const data = treasury.interface.encodeFunctionData(
      "transferETH",
      [recipient.address, amount]
    );

    await governance.connect(proposer).propose(
      treasury.address,
      amount,
      data
    );

    // advance into voting & execution window
    await governance.connect(proposer).queue(1);

    await expect(
      executor.executeQueued(1)
    ).to.be.revertedWith("eth transfer failed");
  });

  it("reverts if ERC20 balance is insufficient", async function () {
    const {
      proposer,
      governance,
      executor,
      treasury,
      token,
      recipient,
    } = await setupGovernance();

    const amount = 500;

    const data = treasury.interface.encodeFunctionData(
      "transferERC20",
      [token.address, recipient.address, amount]
    );

    await governance.connect(proposer).propose(
      treasury.address,
      0,
      data
    );

    await governance.connect(proposer).queue(1);

    await expect(
      executor.executeQueued(1)
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

  });
});
