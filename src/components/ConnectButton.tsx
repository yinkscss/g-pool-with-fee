import { LogOut, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { useWallet } from "../lib/useWallet";
import { shortAddress } from "../lib/utils";

/** Connect button: opens the wallet list; once connected, shows the address and a disconnect button. */
export function ConnectButton() {
  const { account, connect, disconnect, connecting, walletName } = useWallet();
  if (account) {
    return (
      <div className="inline-flex items-center gap-1">
        <Button variant="outline" title={walletName ? "Connected with " + walletName : undefined}>
          {shortAddress(account)}
        </Button>
        <Button variant="ghost" size="sm" onClick={disconnect} aria-label="Disconnect wallet" title="Disconnect">
          <LogOut className="size-4" />
        </Button>
      </div>
    );
  }
  return (
    <Button onClick={connect} disabled={connecting}>
      <Wallet className="size-4" />
      {connecting ? "Connecting…" : "Connect wallet"}
    </Button>
  );
}
