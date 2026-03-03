# Security Policy & Threat Model

This document describes the security assumptions, threat model,
and vulnerability disclosure process for the protocol.

---

## 1. Security Philosophy

The protocol is designed to minimize trust and reduce attack surface
by enforcing strict on-chain governance controls.

Core principles:

* No privileged administrators
* No emergency EOAs
* All critical actions gated by governance
* Time-delayed execution for safety

---

## 2. System Overview

The protocol consists of the following security-critical components:

* **DAOToken (ERC20Votes)**
  Snapshot-based voting power and delegation.

* **Governance Contract**
  Proposal creation, voting, quorum enforcement.

* **Timelock Controller**
  Enforces execution delay and acts as sole executor.

* **Treasury**
  Holds ETH and ERC20 tokens, restricted to timelock execution.

---

## 3. Threat Model

### 3.1 In-Scope Threats

The following threats are explicitly considered and mitigated:

#### Governance Attacks

* Flash-loan voting attacks
  → Mitigated via snapshot-based voting (`getPastVotes`)

* Proposal spam
  → Mitigated via proposal threshold

* Low-participation governance capture
  → Mitigated via quorum enforcement

#### Execution Attacks

* Immediate execution after vote
  → Mitigated via timelock delay

* Double execution / replay
  → Prevented via execution state tracking

#### Treasury Attacks

* Unauthorized ETH or ERC20 withdrawal
  → Treasury restricted to timelock-only execution

* Governance bypass of treasury
  → Governance cannot directly execute transfers

* Reentrancy attacks
  → Treasury protected via `ReentrancyGuard`

* Over-withdrawal
  → Transfers revert on insufficient balance

#### ERC20 Risks

* Non-standard ERC20 behavior
  → Mitigated via OpenZeppelin `SafeERC20`

---

## 4. Out-of-Scope Threats

The following are **explicitly out of scope**:

* Token price manipulation
* Off-chain governance coordination
* Social engineering attacks
* Compromised private keys of token holders
* Majority token-holder governance decisions

If a malicious majority approves a proposal, it is considered
a governance decision, not a protocol vulnerability.

---

## 5. Security Assumptions

The protocol assumes:

* Ethereum mainnet consensus security
* Correct behavior of OpenZeppelin libraries
* Honest majority of governance token holders
* Proper deployment configuration (correct timelock executor)

---

## 6. Upgrade & Change Safety

Any change to:

* Governance parameters
* Treasury logic
* Execution flow

must itself be approved through governance and executed via timelock.

There are no privileged upgrade roles.

---

## 7. Testing & Auditing

The protocol includes:

* Unit tests for governance logic
* End-to-end governance flow tests
* Treasury security and attack simulation tests

Independent audits are recommended before production deployment.

---

## 8. Vulnerability Disclosure

If you discover a security vulnerability:

* **Do NOT open a public issue**
* Report privately via:

  * Email: `security@yourproject.xyz`
  * Or GitHub Security Advisories

Please include:

* Clear description of the issue
* Steps to reproduce
* Potential impact
* Suggested remediation (if available)

We aim to respond within **48 hours**.

---

## 9. Bug Bounty (Optional)

A formal bug bounty program may be introduced in the future.
Until then, responsible disclosure is strongly encouraged.

---

## 10. Summary

The protocol is designed with defense-in-depth:

* Governance safeguards
* Timelock execution
* Treasury isolation
* Extensive testing

Security is an ongoing process, and community review is welcomed.
