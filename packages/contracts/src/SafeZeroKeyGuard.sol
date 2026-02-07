// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Enum} from "safe-smart-account/contracts/interfaces/Enum.sol";
import {BaseTransactionGuard} from "safe-smart-account/contracts/base/GuardManager.sol";

/**
 * @title SafeZeroKeyGuard
 * @notice A Safe Guard that enforces policies on Safe transactions
 * @dev Implements ITransactionGuard to hook into Safe's transaction flow
 * 
 * Architecture:
 * 1. User registers their Safe on ZeroKey dashboard
 * 2. User adds this Guard to their Safe via setGuard()
 * 3. All transactions from the Safe go through checkTransaction()
 * 4. Guard checks against user-defined policies (max amount, recipient whitelist, etc.)
 */
contract SafeZeroKeyGuard is BaseTransactionGuard {
    /// @notice Policy config for each Safe
    struct Policy {
        bool enabled;
        uint256 maxTransferValue;  // 0 = no limit
        bool allowArbitraryCalls;  // false = only allow ETH transfers
        mapping(address => bool) allowedRecipients;  // whitelist (empty = all allowed)
        mapping(address => bool) blockedRecipients;  // blacklist
        uint256 dailyLimit;        // daily transfer limit (0 = no limit)
        uint256 dailySpent;        // amount spent today
        uint256 lastResetTimestamp;
    }

    /// @notice Policies per Safe address
    mapping(address => Policy) public policies;

    /// @notice Admins who can update policies for each Safe
    mapping(address => address) public safeAdmins;

    /// @notice ZeroKey backend oracle for dynamic approval
    address public policyOracle;

    /// @notice Owner of this contract
    address public owner;

    /// @notice Pre-approved transactions (approved by oracle before execution)
    mapping(bytes32 => bool) public preApproved;

    // Events
    event PolicyUpdated(address indexed safe, uint256 maxTransferValue, uint256 dailyLimit);
    event SafeRegistered(address indexed safe, address indexed admin);
    event TransactionBlocked(address indexed safe, address to, uint256 value, string reason);
    event TransactionApproved(address indexed safe, address to, uint256 value);
    event RecipientWhitelisted(address indexed safe, address indexed recipient);
    event RecipientBlacklisted(address indexed safe, address indexed recipient);
    event TransactionPreApproved(bytes32 indexed txHash, address indexed safe);

    // Errors
    error NotAdmin();
    error NotOwner();
    error NotOracle();
    error SafeNotRegistered();
    error ExceedsMaxValue();
    error RecipientBlocked();
    error RecipientNotWhitelisted();
    error ArbitraryCallsNotAllowed();
    error ExceedsDailyLimit();
    error PolicyNotEnabled();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != policyOracle) revert NotOracle();
        _;
    }

    modifier onlySafeAdmin(address safe) {
        if (safeAdmins[safe] != msg.sender && msg.sender != owner) revert NotAdmin();
        _;
    }

    constructor(address _policyOracle) {
        owner = msg.sender;
        policyOracle = _policyOracle;
    }

    /**
     * @notice Register a Safe with ZeroKey Guard
     * @param safe The Safe address to protect
     */
    function registerSafe(address safe) external {
        safeAdmins[safe] = msg.sender;
        policies[safe].enabled = true;
        policies[safe].lastResetTimestamp = block.timestamp;
        emit SafeRegistered(safe, msg.sender);
    }

    /**
     * @notice Set basic policy parameters
     * @param safe The Safe address
     * @param maxTransferValue Max value per transaction (0 = no limit)
     * @param dailyLimit Daily spending limit (0 = no limit)
     * @param allowArbitraryCalls Whether to allow contract calls
     */
    function setPolicy(
        address safe,
        uint256 maxTransferValue,
        uint256 dailyLimit,
        bool allowArbitraryCalls
    ) external onlySafeAdmin(safe) {
        Policy storage p = policies[safe];
        p.maxTransferValue = maxTransferValue;
        p.dailyLimit = dailyLimit;
        p.allowArbitraryCalls = allowArbitraryCalls;
        emit PolicyUpdated(safe, maxTransferValue, dailyLimit);
    }

    /**
     * @notice Add recipient to whitelist
     */
    function addToWhitelist(address safe, address recipient) external onlySafeAdmin(safe) {
        policies[safe].allowedRecipients[recipient] = true;
        emit RecipientWhitelisted(safe, recipient);
    }

    /**
     * @notice Add recipient to blacklist
     */
    function addToBlacklist(address safe, address recipient) external onlySafeAdmin(safe) {
        policies[safe].blockedRecipients[recipient] = true;
        emit RecipientBlacklisted(safe, recipient);
    }

    /**
     * @notice Remove recipient from whitelist
     */
    function removeFromWhitelist(address safe, address recipient) external onlySafeAdmin(safe) {
        policies[safe].allowedRecipients[recipient] = false;
    }

    /**
     * @notice Remove recipient from blacklist
     */
    function removeFromBlacklist(address safe, address recipient) external onlySafeAdmin(safe) {
        policies[safe].blockedRecipients[recipient] = false;
    }

    /**
     * @notice Pre-approve a specific transaction (called by oracle)
     * @param txHash The hash of the transaction to approve
     * @param safe The Safe executing this transaction
     */
    function preApproveTransaction(bytes32 txHash, address safe) external onlyOracle {
        preApproved[txHash] = true;
        emit TransactionPreApproved(txHash, safe);
    }

    /**
     * @notice Check transaction before execution (called by Safe)
     * @dev This is the main policy enforcement point
     */
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external override {
        address safe = msg.sender;  // The Safe contract calls this
        Policy storage p = policies[safe];

        // If Safe is not registered, allow (non-intrusive default)
        if (!p.enabled) {
            return;
        }

        // Compute transaction hash for pre-approval check
        bytes32 txHash = keccak256(
            abi.encodePacked(safe, to, value, keccak256(data), operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver)
        );

        // If transaction is pre-approved by oracle, allow immediately
        if (preApproved[txHash]) {
            delete preApproved[txHash];  // One-time use
            emit TransactionApproved(safe, to, value);
            return;
        }

        // Check 1: Recipient blacklist
        if (p.blockedRecipients[to]) {
            emit TransactionBlocked(safe, to, value, "Recipient blacklisted");
            revert RecipientBlocked();
        }

        // Check 2: Max transfer value
        if (p.maxTransferValue > 0 && value > p.maxTransferValue) {
            emit TransactionBlocked(safe, to, value, "Exceeds max value");
            revert ExceedsMaxValue();
        }

        // Check 3: Daily limit
        if (p.dailyLimit > 0) {
            // Reset daily counter if new day
            if (block.timestamp > p.lastResetTimestamp + 1 days) {
                p.dailySpent = 0;
                p.lastResetTimestamp = block.timestamp;
            }
            if (p.dailySpent + value > p.dailyLimit) {
                emit TransactionBlocked(safe, to, value, "Exceeds daily limit");
                revert ExceedsDailyLimit();
            }
            p.dailySpent += value;
        }

        // Check 4: Arbitrary calls (contract interactions)
        if (!p.allowArbitraryCalls && data.length > 0) {
            emit TransactionBlocked(safe, to, value, "Arbitrary calls not allowed");
            revert ArbitraryCallsNotAllowed();
        }

        emit TransactionApproved(safe, to, value);

        // Suppress unused parameter warnings
        (operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, signatures, msgSender);
    }

    /**
     * @notice Called after transaction execution
     */
    function checkAfterExecution(bytes32 hash, bool success) external override {
        // Could add post-execution logging here
        (hash, success);  // Suppress warnings
    }

    /**
     * @notice Update the policy oracle address
     */
    function setPolicyOracle(address newOracle) external onlyOwner {
        policyOracle = newOracle;
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    /**
     * @notice Check if a recipient is whitelisted for a Safe
     */
    function isWhitelisted(address safe, address recipient) external view returns (bool) {
        return policies[safe].allowedRecipients[recipient];
    }

    /**
     * @notice Check if a recipient is blacklisted for a Safe
     */
    function isBlacklisted(address safe, address recipient) external view returns (bool) {
        return policies[safe].blockedRecipients[recipient];
    }

    /**
     * @notice Get policy details for a Safe
     */
    function getPolicy(address safe) external view returns (
        bool enabled,
        uint256 maxTransferValue,
        uint256 dailyLimit,
        uint256 dailySpent,
        bool allowArbitraryCalls
    ) {
        Policy storage p = policies[safe];
        return (
            p.enabled,
            p.maxTransferValue,
            p.dailyLimit,
            p.dailySpent,
            p.allowArbitraryCalls
        );
    }
}
