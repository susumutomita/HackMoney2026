// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Enum} from "safe-smart-account/contracts/interfaces/Enum.sol";
import {BaseTransactionGuard} from "safe-smart-account/contracts/base/GuardManager.sol";

/**
 * @title RecipientInvariantGuard
 * @notice Minimal Safe Guard for the demo: enforce that USDC transfers can only go to an expected recipient.
 *
 * This is the wallet-enforced proof that "agents don't choose security".
 * If an agent (or attacker) tries to transfer USDC to a different recipient, the Safe tx reverts.
 */
contract RecipientInvariantGuard is BaseTransactionGuard {
    address public owner;

    /// @notice Token contract (USDC) to guard.
    address public immutable usdc;

    /// @notice Expected recipient for USDC transfers.
    address public expectedRecipient;

    /// @notice The Safe this guard is intended for (optional safety).
    address public safe;

    // ERC20 transfer selector: transfer(address,uint256)
    bytes4 internal constant TRANSFER_SELECTOR = 0xa9059cbb;

    event Configured(address indexed safe, address indexed usdc, address indexed expectedRecipient);
    event ExpectedRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    error NotOwner();
    error NotSafe();
    error RecipientMismatch(address expected, address got);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _usdc, address _safe, address _expectedRecipient) {
        owner = msg.sender;
        usdc = _usdc;
        safe = _safe;
        expectedRecipient = _expectedRecipient;
        emit Configured(_safe, _usdc, _expectedRecipient);
    }

    function setExpectedRecipient(address newRecipient) external onlyOwner {
        address old = expectedRecipient;
        expectedRecipient = newRecipient;
        emit ExpectedRecipientUpdated(old, newRecipient);
    }

    function setSafe(address newSafe) external onlyOwner {
        safe = newSafe;
    }

    /**
     * @dev Called by Safe before executing a tx.
     * We only enforce for USDC transfer() calls.
     */
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256,
        uint256,
        uint256,
        address,
        address payable,
        bytes memory,
        address
    ) external view override {
        // If configured to a specific Safe, only allow calls from that Safe.
        if (safe != address(0) && msg.sender != safe) revert NotSafe();

        // Only guard ERC20 calls.
        if (to != usdc) return;
        if (operation != Enum.Operation.Call) return;

        // No ETH value should be sent to ERC20 transfer.
        (value);

        if (data.length < 4) return;
        bytes4 sel;
        assembly {
            sel := mload(add(data, 0x20))
        }
        if (sel != TRANSFER_SELECTOR) return;

        // Decode transfer(address,uint256) without slicing (more portable for Foundry/Solc)
        address recipient;
        assembly {
            // data layout: 0x00 length, 0x20 selector+arg1 (first 32 bytes), 0x40 arg2
            // recipient is first argument, right-aligned in the 32-byte word at data+0x24
            recipient := shr(96, mload(add(data, 0x24)))
        }

        if (recipient != expectedRecipient) revert RecipientMismatch(expectedRecipient, recipient);
    }

    function checkAfterExecution(bytes32, bool) external pure override {}
}
