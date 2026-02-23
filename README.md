# SimpleDAO

A minimal AnyDAO-inspired governance protocol.

## Features

- Token-based governance
- On-chain treasury
- Executable proposals
- Timelock-ready architecture

## Status

⚠️ Early development — not audited

### Treasury Assets

The DAO treasury can hold:
- ETH
- Any ERC20 token

All transfers must be executed through governance proposals
and are subject to quorum and timelock delays.

### Proposal Threshold

To prevent spam proposals, proposers must hold at least a
configurable percentage of total voting power at snapshot time.


