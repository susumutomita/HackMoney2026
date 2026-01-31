// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IZeroKeyGuard
 * @notice Interface for the ZeroKey execution guard contract
 */
interface IZeroKeyGuard {
    /**
     * @notice Submit a policy decision for a transaction
     * @param txHash The hash of the transaction being evaluated
     * @param approved Whether the transaction is approved
     * @param riskLevel The risk level (1=low, 2=medium, 3=high)
     * @param reason Human-readable explanation for the decision
     */
    function submitDecision(bytes32 txHash, bool approved, uint256 riskLevel, string calldata reason) external;

    /**
     * @notice Check if a transaction has been approved
     * @param txHash The hash of the transaction
     * @return Whether the transaction is approved
     */
    function isApproved(bytes32 txHash) external view returns (bool);

    /**
     * @notice Validate that a transaction is approved, reverts if not
     * @param txHash The hash of the transaction
     */
    function validateTransaction(bytes32 txHash) external view;
}
