// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;

contract Treasury is ReentrancyGuard {
    // executor is typically the Timelock contract
    address public executor;

  constructor(address _executor) {
    executor = _executor;
  }

  modifier onlyExecutor() {
    require(msg.sender == executor, 'not executor');
    _;
  }

  receive() external payable {}

    function transferETH(
        address to,
        uint256 amount
    ) external onlyExecutor nonReentrant {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "eth transfer failed");
    }

    function transferERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyExecutor nonReentrant {
        IERC20(token).safeTransfer(to, amount);
    }
}
