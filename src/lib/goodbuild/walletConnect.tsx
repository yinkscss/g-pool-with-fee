/**
 * Written by GoodBuild. In the preview this is a stand-in: phone wallets (WalletConnect) connect once
 * the app is published, where GoodBuild puts the real module here. Don't edit or import it.
 */
import type { Chain, EIP1193Provider } from "viem";

export const walletConnectBuiltIn = false;

export async function connectWalletConnect(_args: { projectId: string; chain: Chain; onUri: (uri: string) => void }): Promise<EIP1193Provider> {
  throw new Error("Phone wallets connect once this app is published.");
}

export async function restoreWalletConnect(_args: { projectId: string; chain: Chain }): Promise<EIP1193Provider | null> {
  return null;
}

export function cancelWalletConnect(): void {}

export function QrCode(_props: { value: string }) {
  return null;
}
