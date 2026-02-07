/**
 * SafeZeroKeyGuard Contract ABI (subset used by backend)
 * Derived from packages/contracts/src/SafeZeroKeyGuard.sol
 */
export const SafeZeroKeyGuardAbi = [
  {
    type: "function",
    name: "computeTxHash",
    inputs: [
      { name: "safe", type: "address", internalType: "address" },
      { name: "to", type: "address", internalType: "address" },
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "data", type: "bytes", internalType: "bytes" },
      { name: "operation", type: "uint8", internalType: "enum Enum.Operation" },
      { name: "safeTxGas", type: "uint256", internalType: "uint256" },
      { name: "baseGas", type: "uint256", internalType: "uint256" },
      { name: "gasPrice", type: "uint256", internalType: "uint256" },
      { name: "gasToken", type: "address", internalType: "address" },
      { name: "refundReceiver", type: "address", internalType: "address payable" },
      { name: "msgSender", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "submitDecision",
    inputs: [
      { name: "txHash", type: "bytes32", internalType: "bytes32" },
      { name: "approved", type: "bool", internalType: "bool" },
      { name: "riskLevel", type: "uint256", internalType: "uint256" },
      { name: "reason", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "registeredSafes",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isApproved",
    inputs: [{ name: "txHash", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "policyOracle",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
] as const;
