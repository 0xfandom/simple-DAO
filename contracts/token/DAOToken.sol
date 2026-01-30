// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract DAOToken is ERC20Votes, ERC20Permit, Ownable {
    address public governance;

    constructor()
        ERC20("SimpleDAO Token", "SDT")
        ERC20Permit("SimpleDAO Token")
        Ownable(msg.sender)
    {}

    function setGovernance(address _governance) external onlyOwner {
        governance = _governance;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == governance, "not governance");
        _mint(to, amount);
    }

    /* Required overrides */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(
        address owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
