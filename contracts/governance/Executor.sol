// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Governance.sol";

contract Executor {
    Governance public governance;

    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _gov) {
        governance = Governance(_gov);
    }

    function execute(uint256 proposalId) external {
        governance.executeProposal(proposalId);

        emit ProposalExecuted(proposalId);
    }
}
