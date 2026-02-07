// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SafeZeroKeyGuard} from "../src/SafeZeroKeyGuard.sol";
import {Enum} from "safe-smart-account/contracts/interfaces/Enum.sol";

contract SafeZeroKeyGuardTest is Test {
    SafeZeroKeyGuard public guard;
    address public deployer;
    address public oracle;
    address public admin;
    address public safe;
    address public recipient;
    address public user;

    event PolicyUpdated(address indexed safe, uint256 maxTransferValue, uint256 dailyLimit);
    event SafeRegistered(address indexed safe, address indexed admin);
    event TransactionBlocked(address indexed safe, address to, uint256 value, string reason);
    event TransactionApproved(address indexed safe, address to, uint256 value);
    event RecipientWhitelisted(address indexed safe, address indexed recipient);
    event RecipientBlacklisted(address indexed safe, address indexed recipient);
    event TransactionPreApproved(bytes32 indexed txHash, address indexed safe);

    function setUp() public {
        deployer = address(this);
        oracle = makeAddr("oracle");
        admin = makeAddr("admin");
        safe = makeAddr("safe");
        recipient = makeAddr("recipient");
        user = makeAddr("user");

        guard = new SafeZeroKeyGuard(oracle);
    }

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────

    function test_Constructor() public view {
        assertEq(guard.owner(), deployer);
        assertEq(guard.policyOracle(), oracle);
    }

    // ──────────────────────────────────────────────
    // Safe Registration
    // ──────────────────────────────────────────────

    function test_RegisterSafe() public {
        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit SafeRegistered(safe, admin);
        guard.registerSafe(safe);

        assertEq(guard.safeAdmins(safe), admin);
        (bool enabled,,,,) = guard.getPolicy(safe);
        assertTrue(enabled);
    }

    // ──────────────────────────────────────────────
    // Policy Management
    // ──────────────────────────────────────────────

    function test_SetPolicy() public {
        vm.prank(admin);
        guard.registerSafe(safe);

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit PolicyUpdated(safe, 10 ether, 50 ether);
        guard.setPolicy(safe, 10 ether, 50 ether, false);

        (bool enabled, uint256 maxVal, uint256 dailyLim,, bool allowCalls) = guard.getPolicy(safe);
        assertTrue(enabled);
        assertEq(maxVal, 10 ether);
        assertEq(dailyLim, 50 ether);
        assertFalse(allowCalls);
    }

    function test_SetPolicy_OnlyAdmin() public {
        vm.prank(admin);
        guard.registerSafe(safe);

        vm.prank(user);
        vm.expectRevert(SafeZeroKeyGuard.NotAdmin.selector);
        guard.setPolicy(safe, 10 ether, 50 ether, false);
    }

    function test_OwnerCanSetPolicy() public {
        vm.prank(admin);
        guard.registerSafe(safe);

        // Owner (deployer) can also set policy
        guard.setPolicy(safe, 5 ether, 25 ether, true);
        (,uint256 maxVal,,,) = guard.getPolicy(safe);
        assertEq(maxVal, 5 ether);
    }

    // ──────────────────────────────────────────────
    // Whitelist / Blacklist
    // ──────────────────────────────────────────────

    function test_AddToWhitelist() public {
        vm.prank(admin);
        guard.registerSafe(safe);

        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit RecipientWhitelisted(safe, recipient);
        guard.addToWhitelist(safe, recipient);

        assertTrue(guard.isWhitelisted(safe, recipient));
    }

    function test_AddToBlacklist() public {
        vm.prank(admin);
        guard.registerSafe(safe);

        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit RecipientBlacklisted(safe, recipient);
        guard.addToBlacklist(safe, recipient);

        assertTrue(guard.isBlacklisted(safe, recipient));
    }

    function test_RemoveFromWhitelist() public {
        vm.prank(admin);
        guard.registerSafe(safe);

        vm.startPrank(admin);
        guard.addToWhitelist(safe, recipient);
        assertTrue(guard.isWhitelisted(safe, recipient));

        guard.removeFromWhitelist(safe, recipient);
        assertFalse(guard.isWhitelisted(safe, recipient));
        vm.stopPrank();
    }

    // ──────────────────────────────────────────────
    // Pre-approval (Oracle)
    // ──────────────────────────────────────────────

    function test_PreApproveTransaction() public {
        bytes32 txHash = keccak256("test-tx");

        vm.prank(oracle);
        vm.expectEmit(true, true, false, true);
        emit TransactionPreApproved(txHash, safe);
        guard.preApproveTransaction(txHash, safe);

        assertTrue(guard.preApproved(txHash));
    }

    function test_PreApprove_OnlyOracle() public {
        bytes32 txHash = keccak256("test-tx");

        vm.prank(user);
        vm.expectRevert(SafeZeroKeyGuard.NotOracle.selector);
        guard.preApproveTransaction(txHash, safe);
    }

    // ──────────────────────────────────────────────
    // checkTransaction - Core Guard Logic
    // ──────────────────────────────────────────────

    function test_CheckTransaction_UnregisteredSafe_Allows() public {
        // Unregistered Safe → policy not enabled → transaction allowed
        vm.prank(safe);
        guard.checkTransaction(
            recipient, 1 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }

    function test_CheckTransaction_WithinLimits_Allows() public {
        vm.prank(admin);
        guard.registerSafe(safe);
        vm.prank(admin);
        guard.setPolicy(safe, 10 ether, 100 ether, true);

        vm.prank(safe);
        guard.checkTransaction(
            recipient, 5 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }

    function test_CheckTransaction_ExceedsMaxValue_Reverts() public {
        vm.prank(admin);
        guard.registerSafe(safe);
        vm.prank(admin);
        guard.setPolicy(safe, 10 ether, 0, true);

        vm.prank(safe);
        vm.expectRevert(SafeZeroKeyGuard.ExceedsMaxValue.selector);
        guard.checkTransaction(
            recipient, 15 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }

    function test_CheckTransaction_RecipientBlocked_Reverts() public {
        vm.prank(admin);
        guard.registerSafe(safe);
        vm.prank(admin);
        guard.addToBlacklist(safe, recipient);

        vm.prank(safe);
        vm.expectRevert(SafeZeroKeyGuard.RecipientBlocked.selector);
        guard.checkTransaction(
            recipient, 1 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }

    function test_CheckTransaction_ArbitraryCallsBlocked_Reverts() public {
        vm.prank(admin);
        guard.registerSafe(safe);
        vm.prank(admin);
        guard.setPolicy(safe, 0, 0, false); // allowArbitraryCalls = false

        bytes memory calldata_ = abi.encodeWithSignature("transfer(address,uint256)", recipient, 100);

        vm.prank(safe);
        vm.expectRevert(SafeZeroKeyGuard.ArbitraryCallsNotAllowed.selector);
        guard.checkTransaction(
            recipient, 0, calldata_, Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }

    function test_CheckTransaction_DailyLimit_Tracks() public {
        vm.prank(admin);
        guard.registerSafe(safe);
        vm.prank(admin);
        guard.setPolicy(safe, 0, 10 ether, true); // 10 ETH daily limit

        // First tx: 4 ETH - OK
        vm.prank(safe);
        guard.checkTransaction(
            recipient, 4 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );

        // Second tx: 4 ETH - OK (total 8)
        vm.prank(safe);
        guard.checkTransaction(
            recipient, 4 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );

        // Third tx: 4 ETH - BLOCKED (total would be 12 > 10)
        vm.prank(safe);
        vm.expectRevert(SafeZeroKeyGuard.ExceedsDailyLimit.selector);
        guard.checkTransaction(
            recipient, 4 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }

    function test_CheckTransaction_DailyLimit_ResetAfterDay() public {
        vm.prank(admin);
        guard.registerSafe(safe);
        vm.prank(admin);
        guard.setPolicy(safe, 0, 10 ether, true);

        // Spend 9 ETH
        vm.prank(safe);
        guard.checkTransaction(
            recipient, 9 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );

        // Warp 1 day + 1 second
        vm.warp(block.timestamp + 1 days + 1);

        // Should be allowed again after daily reset
        vm.prank(safe);
        guard.checkTransaction(
            recipient, 9 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }

    function test_CheckTransaction_PreApproved_Bypasses() public {
        vm.prank(admin);
        guard.registerSafe(safe);
        vm.prank(admin);
        guard.setPolicy(safe, 1 ether, 0, false); // Max 1 ETH, no contract calls

        // Pre-approve a 100 ETH tx
        bytes32 txHash = keccak256(
            abi.encodePacked(safe, recipient, uint256(100 ether), keccak256(bytes("")), Enum.Operation.Call, uint256(0), uint256(0), uint256(0), address(0), payable(address(0)))
        );

        vm.prank(oracle);
        guard.preApproveTransaction(txHash, safe);

        // 100 ETH tx goes through because pre-approved
        vm.prank(safe);
        guard.checkTransaction(
            recipient, 100 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );

        // Pre-approval consumed (one-time use)
        assertFalse(guard.preApproved(txHash));
    }

    // ──────────────────────────────────────────────
    // Admin Functions
    // ──────────────────────────────────────────────

    function test_SetPolicyOracle() public {
        address newOracle = makeAddr("newOracle");
        guard.setPolicyOracle(newOracle);
        assertEq(guard.policyOracle(), newOracle);
    }

    function test_SetPolicyOracle_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(SafeZeroKeyGuard.NotOwner.selector);
        guard.setPolicyOracle(makeAddr("x"));
    }

    function test_TransferOwnership() public {
        address newOwner = makeAddr("newOwner");
        guard.transferOwnership(newOwner);
        assertEq(guard.owner(), newOwner);
    }

    function test_TransferOwnership_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(SafeZeroKeyGuard.NotOwner.selector);
        guard.transferOwnership(makeAddr("x"));
    }

    // ──────────────────────────────────────────────
    // Full Flow Integration
    // ──────────────────────────────────────────────

    function test_FullFlow_RegisterSetPolicyAndTransact() public {
        // 1. Admin registers Safe
        vm.prank(admin);
        guard.registerSafe(safe);

        // 2. Admin sets policy: max 5 ETH, 20 ETH daily, no contract calls
        vm.prank(admin);
        guard.setPolicy(safe, 5 ether, 20 ether, false);

        // 3. Admin whitelists a recipient
        vm.prank(admin);
        guard.addToWhitelist(safe, recipient);

        // 4. Transaction within limits - allowed
        vm.prank(safe);
        guard.checkTransaction(
            recipient, 3 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );

        // 5. Transaction over limit - blocked
        vm.prank(safe);
        vm.expectRevert(SafeZeroKeyGuard.ExceedsMaxValue.selector);
        guard.checkTransaction(
            recipient, 6 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }

    function test_FullFlow_OraclePreApprovalOverridesPolicy() public {
        // 1. Register and set strict policy
        vm.prank(admin);
        guard.registerSafe(safe);
        vm.prank(admin);
        guard.setPolicy(safe, 1 ether, 1 ether, false);

        // 2. Oracle pre-approves a large tx
        bytes32 txHash = keccak256(
            abi.encodePacked(safe, recipient, uint256(50 ether), keccak256(bytes("")), Enum.Operation.Call, uint256(0), uint256(0), uint256(0), address(0), payable(address(0)))
        );
        vm.prank(oracle);
        guard.preApproveTransaction(txHash, safe);

        // 3. Large tx goes through despite strict policy
        vm.prank(safe);
        guard.checkTransaction(
            recipient, 50 ether, "", Enum.Operation.Call,
            0, 0, 0, address(0), payable(address(0)), "", user
        );
    }
}
