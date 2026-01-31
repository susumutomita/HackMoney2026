// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ZeroKeyGuard} from "../src/ZeroKeyGuard.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address policyOracle = vm.envAddress("POLICY_ORACLE_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        ZeroKeyGuard guard = new ZeroKeyGuard(policyOracle);

        console2.log("ZeroKeyGuard deployed at:", address(guard));
        console2.log("Policy Oracle:", policyOracle);

        vm.stopBroadcast();
    }
}
