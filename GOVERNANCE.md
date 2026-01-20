# Governance Overview

This document describes the governance system of the protocol, including
proposal creation, voting, execution, and treasury control.

The governance design follows battle-tested patterns used by major DeFi DAOs
such as Compound and Uniswap.

---

## 1. Governance Components

The protocol governance consists of the following on-chain components:

* **DAOToken (ERC20Votes)**
  Provides voting power and historical vote snapshots.

* **Governance Contract**
  Handles proposal creation, voting, quorum checks, and proposal lifecycle.

* **Timelock Controller**
  Enforces a mandatory delay between proposal approval and execution.

* **Treasury**
  Holds ETH and ERC20 assets and can only be accessed through governance execution.

---

## 2. Proposal Creation

To create a proposal, an address must hold a minimum amount of voting power
(called the **proposal threshold**) at the snapshot block.

### Proposal Threshold

* Expressed in basis points (bps)
* Calculated as a percentage of total token supply
* Verified using historical voting power (`getPastVotes`)

If the threshold is not met, proposal creation will revert.

---

## 3. Voting Process

Voting is **snapshot-based** to prevent manipulation.

### Key Properties

* Voting power is read at `snapshotBlock = block.number - 1`
* Token transfers after proposal creation do not affect votes
* Each address may vote once per proposal

### Vote Types

* **For**: supports proposal execution
* **Against**: opposes proposal execution

Votes are weighted by historical voting power.

---

## 4. Quorum Requirements

A proposal must meet **quorum** to be eligible for execution.

### Quorum Definition

* Minimum percentage of total voting power that must participate
* Calculated using snapshot total supply
* Includes both *for* and *against* votes

If quorum is not met, the proposal cannot be executed even if it has majority support.

---

## 5. Proposal Lifecycle

1. **Proposed**
   A valid proposer submits a proposal.

2. **Voting Period**
   Token holders cast votes during the voting window.

3. **Succeeded / Failed**
   Proposal succeeds if:

   * Quorum is reached
   * `forVotes > againstVotes`

4. **Queued**
   Successful proposals are queued in the Timelock.

5. **Executed**
   After the timelock delay, proposals can be executed exactly once.

---

## 6. Timelock Guarantees

The Timelock enforces a minimum delay between approval and execution.

### Purpose

* Allows users to react to governance decisions
* Provides exit window
* Prevents instant execution attacks

The Governance contract **cannot bypass the Timelock**.

---

## 7. Treasury Control

The Treasury holds:

* ETH
* Any ERC20 token

### Access Rules

* Only the Timelock contract may execute treasury transfers
* No EOAs or admins have direct access
* All transfers must pass governance voting, quorum, and timelock delay

### Supported Operations

* ETH transfers
* ERC20 transfers (using SafeERC20)

---

## 8. Security Guarantees

The governance system enforces the following guarantees:

* Snapshot-based voting (anti-flash-loan)
* Proposal threshold (anti-spam)
* Quorum enforcement
* Timelock-delayed execution
* Governance-only treasury access
* Reentrancy protection
* Single-execution enforcement

---

## 9. Governance Events

The protocol emits events for transparency and indexing:

* `ProposalCreated`
* `VoteCast`
* `ProposalQueued`
* `ProposalExecuted`
* `ETHTransferred`
* `ERC20Transferred`

These events enable frontend integration and analytics tooling.

---

## 10. Governance Upgrades

Any change to governance parameters or contracts must itself go through
the governance process and be executed via the Timelock.

There are no privileged roles or emergency administrators.

---

## 11. Summary

This governance system is designed to be:

* Transparent
* Secure
* Decentralized
* Auditable

All critical actions require token-holder consensus and time-delayed execution.
