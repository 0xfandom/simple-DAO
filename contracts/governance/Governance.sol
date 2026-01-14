// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../token/DAOToken.sol";

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

    constructor(address _token) {
        token = DAOToken(_token);
    }

    function propose(
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (uint256) {
        require(token.balanceOf(msg.sender) > 0, "no voting power");

        proposalCount++;
        proposals[proposalCount] = Proposal({
            target: target,
            value: value,
            data: data,
            snapshotBlock: block.number - 1,
            startBlock: block.number,
            endBlock: block.number + 20000,
            executed: false,
            forVotes: 0,
            againstVotes: 0
        });

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
}
