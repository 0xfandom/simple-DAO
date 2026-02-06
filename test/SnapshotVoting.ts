import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Governance — Snapshot Voting", function () {
  let token: any;
  let governance: any;
  let owner: any;
  let alice: any;
  let bob: any;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    /* Deploy Token with voting support */
    const Token = await ethers.getContractFactory("GovernanceToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    /* Deploy Governance */
    const Governance = await ethers.getContractFactory("SimpleGovernance");
    governance = await Governance.deploy(token.target);
    await governance.waitForDeployment();

    /* Mint tokens */
    await token.mint(alice.address, ethers.parseEther("100"));

    /* Delegate voting power */
    await token.connect(alice).delegate(alice.address);
  });

  it("uses snapshot voting power", async () => {
    /* Alice creates proposal */
    const tx = await governance.connect(alice).propose(
      "Snapshot voting proposal"
    );
    await tx.wait();

    const proposalId = 1;

    /* Capture snapshot block */
    const proposal = await governance.proposals(proposalId);
    const snapshotBlock = proposal.snapshotBlock;

    /* Alice transfers tokens AFTER proposal creation */
    await token.connect(alice).transfer(
      bob.address,
      ethers.parseEther("100")
    );

    /* Move to voting period */
    await time.mine(1);

    /* Alice votes */
    await governance.connect(alice).vote(proposalId, true);

    const updatedProposal = await governance.proposals(proposalId);

    /* Voting power should be based on snapshot */
    expect(updatedProposal.forVotes).to.equal(
      ethers.parseEther("100")
    );

    /* Sanity check: current balance is zero */
    expect(await token.balanceOf(alice.address)).to.equal(0n);

    /* Sanity check: voting power at snapshot is preserved */
    const pastVotes = await token.getPastVotes(
      alice.address,
      snapshotBlock
    );
    expect(pastVotes).to.equal(ethers.parseEther("100"));
  });
});
