import { expect } from "chai";
import { ethers } from "hardhat";

import { setupGovernance } from "./helpers/governanceSetup.js";

describe("Treasury → Access Control", function () {
  it("rejects ETH transfer from EOA", async function () {
    const { treasury, user } = await setupGovernance();

    await expect(
      treasury.transferETH(user.address, 1)
    ).to.be.revertedWith("not executor");
  });

  it("rejects ERC20 transfer from EOA", async function () {
    const { treasury, token, user } = await setupGovernance();

    await expect(
      treasury.transferERC20(token.address, user.address, 1)
    ).to.be.revertedWith("not executor");
  });

  it("rejects governance contract calling treasury directly", async function () {
    const { treasury, governance, user } = await setupGovernance();

    await expect(
      treasury
        .connect(governance)
        .transferETH(user.address, 1)
    ).to.be.reverted;
  });
});
