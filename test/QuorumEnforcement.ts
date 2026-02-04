import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Governance — Quorum Enforcement", function () {
  let token: any;
  let governance: any;
  let alice: any;
  let bob: any;
  let carol: any;

  beforeEach(async () => {
    [alice, bob, carol] = await ethers.getSigners();

    /* Deploy governance token */
    const Token = await ethers.getContractFactory("GovernanceToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    /* Deploy governance */
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(token.target);
    await governance.waitForDeployment();

    /* Mint and delegate */
    await token.mint(alice.address, ethers.parseEther("100"));
    await token.mint(bob.address, ethers.parseEther("100"));

    await token.connect(alice).delegate(alice.address);
    await token.connect(bob).delegate(bob.address);
  });

  it("fails if quorum is not met", async () => {
    /* Alice creates proposal */
    await governance.connect(alice).propose("Low quorum proposal");

    const proposalId = 1;

    /* Only Alice votes (assume quorum > 100) */
    await governance.connect(alice).vote(proposalId, true);

    /* Move past voting period */
    await time.mine(20);

    /* Execution should revert due to low quorum */
    await expect(
      governance.executeProposal(proposalId)
    ).to.be.revertedWith("quorum not reached");
  });

  it("passes when quorum and majority are met", async () => {
    /* Alice creates proposal */
    await governance.connect(alice).propose("Valid quorum proposal");

    const proposalId = 1;

    /* Alice + Bob vote in favor */
    await governance.connect(alice).vote(proposalId, true);
    await governance.connect(bob).vote(proposalId, true);

    /* Move past voting period */
    await time.mine(20);

    /* Execution should succeed */
    await expect(
      governance.executeProposal(proposalId)
    ).to.not.be.reverted;

    const proposal = await governance.proposals(proposalId);
    expect(proposal.executed).to.equal(true);
  });
});
