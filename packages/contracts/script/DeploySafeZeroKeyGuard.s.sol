// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SafeZeroKeyGuard} from "../src/SafeZeroKeyGuard.sol";

/**
 * @title DeploySafeZeroKeyGuard
 * @notice Deployment script for SafeZeroKeyGuard contract
 * 
 * Usage:
 *   forge script script/DeploySafeZeroKeyGuard.s.sol:DeploySafeZeroKeyGuard \
 *     --rpc-url $BASE_SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --verify
 */
contract DeploySafeZeroKeyGuard is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address policyOracle = vm.envAddress("POLICY_ORACLE_ADDRESS");
        
        console2.log("Deploying SafeZeroKeyGuard...");
        console2.log("Policy Oracle:", policyOracle);

        vm.startBroadcast(deployerPrivateKey);

        SafeZeroKeyGuard guard = new SafeZeroKeyGuard(policyOracle);
        
        console2.log("SafeZeroKeyGuard deployed at:", address(guard));
        console2.log("Owner:", guard.owner());

        vm.stopBroadcast();
    }
}
