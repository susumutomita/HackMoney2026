/**
 * SafeZeroKeyGuard Contract ABI (subset used by backend)
 * Derived from packages/contracts/src/SafeZeroKeyGuard.sol
 */
export const SafeZeroKeyGuardAbi = [
  {
    type: "function",
    name: "preApproveTransaction",
    inputs: [
      { name: "txHash", type: "bytes32", internalType: "bytes32" },
      { name: "safe", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "preApproved",
    inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
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
  {
    type: "function",
    name: "registerSafe",
    inputs: [{ name: "safe", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPolicy",
    inputs: [
      { name: "safe", type: "address", internalType: "address" },
      { name: "maxTransferValue", type: "uint256", internalType: "uint256" },
      { name: "dailyLimit", type: "uint256", internalType: "uint256" },
      { name: "allowArbitraryCalls", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPolicy",
    inputs: [{ name: "safe", type: "address", internalType: "address" }],
    outputs: [
      { name: "enabled", type: "bool", internalType: "bool" },
      { name: "maxTransferValue", type: "uint256", internalType: "uint256" },
      { name: "dailyLimit", type: "uint256", internalType: "uint256" },
      { name: "dailySpent", type: "uint256", internalType: "uint256" },
      { name: "allowArbitraryCalls", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isWhitelisted",
    inputs: [
      { name: "safe", type: "address", internalType: "address" },
      { name: "recipient", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isBlacklisted",
    inputs: [
      { name: "safe", type: "address", internalType: "address" },
      { name: "recipient", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "TransactionPreApproved",
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "safe", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TransactionApproved",
    inputs: [
      { name: "safe", type: "address", indexed: true, internalType: "address" },
      { name: "to", type: "address", indexed: false, internalType: "address" },
      { name: "value", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TransactionBlocked",
    inputs: [
      { name: "safe", type: "address", indexed: true, internalType: "address" },
      { name: "to", type: "address", indexed: false, internalType: "address" },
      { name: "value", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "reason", type: "string", indexed: false, internalType: "string" },
    ],
    anonymous: false,
  },
] as const;
