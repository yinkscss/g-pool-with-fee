import { createPublicClient, createWalletClient, custom, http, type Abi, type Address } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { requireWallet } from "./goodbuild/wallet";

// The wallet itself (finding wallets, the wallet list, WalletConnect, MiniPay) is GoodBuild's,
// in src/lib/goodbuild/. These are the parts this app uses.
export { connectWallet, disconnectWallet, walletProvider } from "./goodbuild/wallet";

/** Written by GoodBuild for this project's target network. */
export const chain = celo;
export const chains = { [celoSepolia.id]: celoSepolia, [celo.id]: celo } as const;

export const publicClient = createPublicClient({ chain, transport: http() });

/** Send a contract write from the connected wallet (connecting first if needed) and wait for the receipt. */
export async function writeContract(args: {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}) {
  const { provider, account } = await requireWallet();
  const wallet = createWalletClient({ account, chain, transport: custom(provider) });
  const { request } = await publicClient.simulateContract({ ...args, account } as never);
  const hash = await wallet.writeContract(request as never);
  return publicClient.waitForTransactionReceipt({ hash });
}
