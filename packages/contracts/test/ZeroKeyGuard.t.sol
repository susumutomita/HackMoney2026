// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ZeroKeyGuard} from "../src/ZeroKeyGuard.sol";

contract ZeroKeyGuardTest is Test {
    ZeroKeyGuard public guard;
    address public owner;
    address public oracle;
    address public user;

    event TransactionApproved(bytes32 indexed txHash, uint256 riskLevel, string reason);
    event TransactionRejected(bytes32 indexed txHash, uint256 riskLevel, string reason);

    function setUp() public {
        owner = address(this);
        oracle = makeAddr("oracle");
        user = makeAddr("user");

        guard = new ZeroKeyGuard(oracle);
    }

    function test_Constructor() public view {
        assertEq(guard.owner(), owner);
        assertEq(guard.policyOracle(), oracle);
    }

    function test_SubmitApproval() public {
        bytes32 txHash = keccak256("test-transaction");

        vm.prank(oracle);
        vm.expectEmit(true, false, false, true);
        emit TransactionApproved(txHash, 1, "Low risk transfer");
        guard.submitDecision(txHash, true, 1, "Low risk transfer");

        assertTrue(guard.isApproved(txHash));
    }

    function test_SubmitRejection() public {
        bytes32 txHash = keccak256("risky-transaction");

        vm.prank(oracle);
        vm.expectEmit(true, false, false, true);
        emit TransactionRejected(txHash, 3, "Exceeds spending limit");
        guard.submitDecision(txHash, false, 3, "Exceeds spending limit");

        assertFalse(guard.isApproved(txHash));
    }

    function test_ValidateApprovedTransaction() public {
        bytes32 txHash = keccak256("approved-tx");

        vm.prank(oracle);
        guard.submitDecision(txHash, true, 1, "Approved");

        // Should not revert
        guard.validateTransaction(txHash);
    }

    function test_ValidateUnapprovedTransaction_Reverts() public {
        bytes32 txHash = keccak256("unapproved-tx");

        vm.expectRevert(ZeroKeyGuard.TransactionNotApproved.selector);
        guard.validateTransaction(txHash);
    }

    function test_OnlyOracleCanSubmitDecision() public {
        bytes32 txHash = keccak256("test-tx");

        vm.prank(user);
        vm.expectRevert(ZeroKeyGuard.Unauthorized.selector);
        guard.submitDecision(txHash, true, 1, "Should fail");
    }

    function test_SetPolicyOracle() public {
        address newOracle = makeAddr("newOracle");

        guard.setPolicyOracle(newOracle);
        assertEq(guard.policyOracle(), newOracle);
    }

    function test_OnlyOwnerCanSetOracle() public {
        address newOracle = makeAddr("newOracle");

        vm.prank(user);
        vm.expectRevert(ZeroKeyGuard.Unauthorized.selector);
        guard.setPolicyOracle(newOracle);
    }

    function test_TransferOwnership() public {
        address newOwner = makeAddr("newOwner");

        guard.transferOwnership(newOwner);
        assertEq(guard.owner(), newOwner);
    }

    function testFuzz_ApproveMultipleTransactions(bytes32[] calldata txHashes) public {
        vm.startPrank(oracle);
        for (uint256 i = 0; i < txHashes.length; i++) {
            guard.submitDecision(txHashes[i], true, 1, "Fuzz approved");
            assertTrue(guard.isApproved(txHashes[i]));
        }
        vm.stopPrank();
    }
}
