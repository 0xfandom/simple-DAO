// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Governance} from "./Governance.sol";
import {DAOTimelock} from "./Timelock.sol";

contract Executor {
    Governance public governance;
    DAOTimelock public timelock;

    event ProposalExecuted(uint256 indexed proposalId);

    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _gov) {
        governance = Governance(_gov);
    }

    function execute(uint256 proposalId) external {
        governance.executeProposal(proposalId);

        emit ProposalExecuted(proposalId);
    }
}
