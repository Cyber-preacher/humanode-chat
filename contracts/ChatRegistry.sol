// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@biomapper-sdk/libraries/BiomapperLogLib.sol";

contract ChatRegistry {
    // Humanode Testnet-5 Biomapper Log
    IBiomapperLogRead public constant BIOMAPPER_LOG =
        IBiomapperLogRead(0x3f2B3E471b207475519989369d5E4F2cAbd0A39F);

    error NotBiomapped();
    event ChatCreated(address indexed a, address indexed b);

    /// Minimal sample: open a DM only if both are biomapped
    function openDM(address other) external {
        bool okA = BiomapperLogLib.isUniqueInLastGeneration(BIOMAPPER_LOG, msg.sender);
        bool okB = BiomapperLogLib.isUniqueInLastGeneration(BIOMAPPER_LOG, other);
        if (!(okA && okB)) revert NotBiomapped();
        emit ChatCreated(msg.sender, other);
    }
}
