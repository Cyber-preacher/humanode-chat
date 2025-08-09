// contracts/AddressRouter.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract AddressRouter {
    address public owner;
    address public profileRegistry;
    address public chatRegistry;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event ProfileRegistryUpdated(address indexed oldAddr, address indexed newAddr);
    event ChatRegistryUpdated(address indexed oldAddr, address indexed newAddr);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor(address _profile, address _chat) {
        owner = msg.sender;
        profileRegistry = _profile;
        chatRegistry = _chat;
    }

    function setOwner(address newOwner) external onlyOwner {
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setProfileRegistry(address a) external onlyOwner {
        emit ProfileRegistryUpdated(profileRegistry, a);
        profileRegistry = a;
    }

    function setChatRegistry(address a) external onlyOwner {
        emit ChatRegistryUpdated(chatRegistry, a);
        chatRegistry = a;
    }
}
