// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IBiomapperLogRead} from "@biomapper-sdk/core/IBiomapperLogRead.sol";
import {BiomapperLogLib}   from "@biomapper-sdk/libraries/BiomapperLogLib.sol";

contract ChatRegistry {
    enum RoomType { PUBLIC, PRIVATE, DM }
    struct Room { RoomType t; address owner; }

    IBiomapperLogRead public constant BIOMAPPER_LOG =
        IBiomapperLogRead(0x3f2B3E471b207475519989369d5E4F2cAbd0A39F);

    uint256 public nextRoomId;
    mapping(uint256 => Room)                     public rooms;
    mapping(uint256 => mapping(address => bool)) public isMember;

    event RoomCreated(uint256 indexed id, RoomType t, address indexed owner);
    event MemberJoined(uint256 indexed id, address indexed member);

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

    function createRoom(RoomType t) external onlyBiomapped returns (uint256 id) {
        id = ++nextRoomId;
        rooms[id] = Room({ t: t, owner: msg.sender });
        isMember[id][msg.sender] = true;

        emit RoomCreated(id, t, msg.sender);
        emit MemberJoined(id, msg.sender);
    }
}
