// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IBiomapperLogRead} from "@biomapper-sdk/core/IBiomapperLogRead.sol";
import {BiomapperLogLib}   from "@biomapper-sdk/libraries/BiomapperLogLib.sol";

contract ProfileRegistry {
    /// Humanode Testnet-5 BiomapperLog
    IBiomapperLogRead public constant BIOMAPPER_LOG =
        IBiomapperLogRead(0x3f2B3E471b207475519989369d5E4F2cAbd0A39F);

    mapping(address => string) public nickname;
    mapping(bytes32 => bool)  private taken;   // lowercase nick → reserved

    event NicknameSet(address indexed user, string nick);

    modifier onlyBiomapped() {
        require(
            BiomapperLogLib.isUniqueInLastGeneration(
                BIOMAPPER_LOG,
                msg.sender
            ),
            "NotBiomapped"
        );
        _;
    }

    function setNickname(string calldata nick) external onlyBiomapped {
        bytes32 key = keccak256(bytes(_lower(nick)));
        require(!taken[key], "NickTaken");

        // release previous nick
        if (bytes(nickname[msg.sender]).length != 0) {
            taken[keccak256(bytes(_lower(nickname[msg.sender])))] = false;
        }

        taken[key]           = true;
        nickname[msg.sender] = nick;
        emit NicknameSet(msg.sender, nick);
    }

    // lower-case helper
    function _lower(string memory s) private pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint i; i < b.length; ++i) {
            uint8 c = uint8(b[i]);
            if (c >= 65 && c <= 90) b[i] = bytes1(c + 32);
        }
        return string(b);
    }
}
