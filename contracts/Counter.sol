// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract Counter {
    uint256 public count;

    function increment() external {
        count += 1;
    }

    function reset() external {
        count = 0;
    }
}
