// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RecipientInvariantGuard} from "../src/RecipientInvariantGuard.sol";

/**
 * DeployRecipientInvariantGuard
 *
 * Env:
 * - PRIVATE_KEY (uint)
 * - USDC_ADDRESS (address)
 * - SAFE_ADDRESS (address) (optional, 0x0 to disable)
 * - EXPECTED_RECIPIENT (address)
 */
contract DeployRecipientInvariantGuardScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address safe = vm.envOr("SAFE_ADDRESS", address(0));
        address expected = vm.envAddress("EXPECTED_RECIPIENT");

        vm.startBroadcast(deployerPrivateKey);

        RecipientInvariantGuard guard = new RecipientInvariantGuard(usdc, safe, expected);

        console2.log("RecipientInvariantGuard deployed at:", address(guard));
        console2.log("USDC:", usdc);
        console2.log("SAFE:", safe);
        console2.log("EXPECTED_RECIPIENT:", expected);

        vm.stopBroadcast();
    }
}
