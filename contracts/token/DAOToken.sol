// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAOToken is ERC20 {
    address public governance;

    constructor() ERC20("SimpleDAO Token", "SDT") {}

    function setGovernance(address _gov) external {
        require(governance == address(0), "governance already set");
        governance = _gov;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == governance, "not governance");
        _mint(to, amount);
    }
}
