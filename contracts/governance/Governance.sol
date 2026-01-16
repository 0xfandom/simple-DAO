// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DAOToken} from "../token/DAOToken.sol";
import {DAOTimelock} from "./Timelock.sol";

contract Governance {
    struct Proposal {
        address target;
        uint256 value;
        bytes data;
        uint256 snapshotBlock;
        uint256 startBlock;
        uint256 endBlock;
        bool executed;
        uint256 forVotes;
        uint256 againstVotes;
    }

    DAOToken public token;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256 public constant VOTING_PERIOD = 5 days;
    uint256 public quorumBps; // e.g. 1000 = 10%
    DAOTimelock public timelock;
    uint256 public proposalThresholdBps;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed target,
        uint256 value,
        uint256 startBlock,
        uint256 endBlock,
        uint256 snapshotBlock
    );

    constructor(
        address _token,
        uint256 _quorumBps,
        DAOTimelock _timelock,
        uint256 _proposalThresholdBps
    ) {
        require(_quorumBps > 0 && _quorumBps <= 10_000, "invalid quorum");
        token = DAOToken(_token);
        quorumBps = _quorumBps;
        timelock = _timelock;
        proposalThresholdBps = _proposalThresholdBps;
    }

    function propose(
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (uint256) {
        require(token.balanceOf(msg.sender) > 0, "no voting power");

        uint256 snapshotBlock = block.number - 1;

        uint256 proposerVotes = token.getPastVotes(msg.sender, snapshotBlock);

        uint256 totalSupply = token.getPastTotalSupply(snapshotBlock);

        uint256 thresholdVotes = (totalSupply * proposalThresholdBps) / 10_000;

        require(proposerVotes >= thresholdVotes, "proposal threshold not met");

        proposalCount++;
        proposals[proposalCount] = Proposal({
            target: target,
            value: value,
            data: data,
            snapshotBlock: snapshotBlock,
            startBlock: block.number,
            endBlock: block.number + 20000,
            executed: false,
            forVotes: 0,
            againstVotes: 0
        });

        emit ProposalCreated(
            proposalCount,
            msg.sender,
            target,
            value,
            block.number,
            block.number + 20000,
            snapshotBlock
        );

        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.number <= p.endBlock, "voting ended");
        require(!hasVoted[proposalId][msg.sender], "already voted");

        uint256 votes = token.getPastVotes(msg.sender, p.snapshotBlock);

        require(votes > 0, "no votes");

        hasVoted[proposalId][msg.sender] = true;

        if (support) p.forVotes += votes;
        else p.againstVotes += votes;
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];

        require(!p.executed, "already executed");
        require(block.number > p.endBlock, "voting not ended");
        require(p.forVotes > p.againstVotes, "proposal failed");

        p.executed = true;

        (bool ok, ) = p.target.call{value: p.value}(p.data);
        require(ok, "execution failed");
    }

    function getProposal(
        uint256 proposalId
    ) public view returns (Proposal memory proposal) {
        proposal = proposals[proposalId];
    }

    function quorumVotes(uint256 proposalId) public view returns (uint256) {
        Proposal storage p = proposals[proposalId];

        uint256 totalSupply = token.getPastTotalSupply(p.snapshotBlock);

        return (totalSupply * quorumBps) / 10_000;
    }
}
