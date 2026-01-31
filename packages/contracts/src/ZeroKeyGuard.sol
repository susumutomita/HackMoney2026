// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IZeroKeyGuard} from "./interfaces/IZeroKeyGuard.sol";

/**
 * @title ZeroKeyGuard
 * @notice Execution guard contract that validates transactions against off-chain AI policy decisions
 * @dev Implements the Execution Governance Layer for ZeroKey Treasury
 */
contract ZeroKeyGuard is IZeroKeyGuard {
    /// @notice Address authorized to submit policy decisions
    address public policyOracle;

    /// @notice Owner address with admin privileges
    address public owner;

    /// @notice Mapping of transaction hashes to their approval status
    mapping(bytes32 => bool) public approvedTransactions;

    /// @notice Risk level thresholds
    uint256 public constant LOW_RISK = 1;
    uint256 public constant MEDIUM_RISK = 2;
    uint256 public constant HIGH_RISK = 3;

    /// @notice Events
    event TransactionApproved(bytes32 indexed txHash, uint256 riskLevel, string reason);
    event TransactionRejected(bytes32 indexed txHash, uint256 riskLevel, string reason);
    event PolicyOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @notice Errors
    error Unauthorized();
    error TransactionNotApproved();
    error InvalidAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyPolicyOracle() {
        if (msg.sender != policyOracle) revert Unauthorized();
        _;
    }

    constructor(address _policyOracle) {
        if (_policyOracle == address(0)) revert InvalidAddress();
        owner = msg.sender;
        policyOracle = _policyOracle;
        emit OwnershipTransferred(address(0), msg.sender);
        emit PolicyOracleUpdated(address(0), _policyOracle);
    }

    /// @inheritdoc IZeroKeyGuard
    function submitDecision(bytes32 txHash, bool approved, uint256 riskLevel, string calldata reason)
        external
        onlyPolicyOracle
    {
        if (approved) {
            approvedTransactions[txHash] = true;
            emit TransactionApproved(txHash, riskLevel, reason);
        } else {
            approvedTransactions[txHash] = false;
            emit TransactionRejected(txHash, riskLevel, reason);
        }
    }

    /// @inheritdoc IZeroKeyGuard
    function isApproved(bytes32 txHash) external view returns (bool) {
        return approvedTransactions[txHash];
    }

    /// @inheritdoc IZeroKeyGuard
    function validateTransaction(bytes32 txHash) external view {
        if (!approvedTransactions[txHash]) revert TransactionNotApproved();
    }

    /// @notice Update the policy oracle address
    /// @param newOracle The new oracle address
    function setPolicyOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidAddress();
        address oldOracle = policyOracle;
        policyOracle = newOracle;
        emit PolicyOracleUpdated(oldOracle, newOracle);
    }

    /// @notice Transfer ownership of the contract
    /// @param newOwner The new owner address
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
