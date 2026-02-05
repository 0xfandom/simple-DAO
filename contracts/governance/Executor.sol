// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Governance} from "./Governance.sol";
import {DAOTimelock} from "./Timelock.sol";

contract Executor {
    Governance public governance;
    DAOTimelock public timelock;

    constructor(address _governance, DAOTimelock _timelock) {
        governance = Governance(_governance);
        timelock = _timelock;
    }

    function executeQueued(uint256 proposalId) external {
        Governance.Proposal memory p = governance.getProposal(proposalId);

        require(p.queued, "not queued");
        require(!p.executed, "already executed");

        bytes32 salt = keccak256(abi.encode(proposalId));

        timelock.execute(
            p.target,
            p.value,
            p.data,
            bytes32(0),
            salt
        );

        governance.markExecuted(proposalId);
    }
}
