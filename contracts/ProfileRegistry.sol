// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@biomapper-sdk/libraries/BiomapperLogLib.sol";

/// @title ProfileRegistry
/// @notice Minimal profile registry gated by Humanode Biomapper
contract ProfileRegistry {
    /// @notice Humanode Testnet-5 Biomapper Log
    IBiomapperLogRead public constant BIOMAPPER_LOG =
        IBiomapperLogRead(0x3f2B3E471b207475519989369d5E4F2cAbd0A39F);

    mapping(address => string) private _nick;

    event NicknameUpdated(address indexed user, string nickname);

    /// @notice True if `who` is biomapped in the latest generation
    function biomapped(address who) external view returns (bool) {
        return BiomapperLogLib.isUniqueInLastGeneration(BIOMAPPER_LOG, who);
    }

    /// @notice Read nickname for `who`
    function getNickname(address who) external view returns (string memory) {
        return _nick[who];
    }

    /// @notice Set your nickname (allowed only for biomapped users)
    function setNickname(string calldata nickname) external {
        require(
            BiomapperLogLib.isUniqueInLastGeneration(BIOMAPPER_LOG, msg.sender),
            "NOT_BIOMAPPED"
        );
        _nick[msg.sender] = nickname;
        emit NicknameUpdated(msg.sender, nickname);
    }
}
