import { erc20Abi } from "viem";

/** ERC-677: send tokens and call the receiver's onTokenTransfer(from, amount, data) in one transaction. G$ supports it. */
export const erc677Abi = [
  {
    type: "function",
    name: "transferAndCall",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/** ABI for the G$ token: standard ERC-20 plus transferAndCall. */
export const gdTokenAbi = [...erc20Abi, ...erc677Abi] as const;
