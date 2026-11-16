import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Notice } from "./ui/notice";
import { ConnectButton } from "./ConnectButton";
import { InlineSpinner } from "./PoolStats";
import { formatAmount } from "../lib/format";
import { useTx } from "../lib/hooks";
import { writeContract } from "../lib/chain";
import { gdTokenAbi } from "../lib/tokens";

const CHIPS = ["10", "50", "100"];

type JoinProps = {
  account?: Address;
  pool?: Address;
  gd?: Address;
  decimals: number;
  walletGd?: bigint;
  live: boolean;
  onDone: () => void;
};

/** Save G$ into the pool in one transaction with G$'s transferAndCall. */
export function JoinCard({ account, pool, gd, decimals, walletGd, live, onDone }: JoinProps) {
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const tx = useTx();

  const parsed = (() => {
    try {
      return amount ? parseUnits(amount, decimals) : 0n;
    } catch {
      return 0n;
    }
  })();
  const overBalance = walletGd !== undefined && parsed > walletGd;
  const canJoin = !!gd && !!pool && live && parsed > 0n && !overBalance && !tx.pending;
  const disabled = !live || tx.pending;

  async function join() {
    if (!gd || !pool) return;
    setSuccess(null);
    const receipt = await tx.run(() =>
      writeContract({
        address: gd,
        abi: gdTokenAbi,
        functionName: "transferAndCall",
        args: [pool, parsed, "0x"],
      }),
    );
    if (receipt) {
      setSuccess(`Saved ${amount} G$ into the pool.`);
      setAmount("");
      onDone();
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
          <ArrowDownToLine className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Join the pool</h2>
          <p className="text-sm text-muted-foreground">Add G$ to your own balance in the circle.</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="join-amount">Amount</Label>
        <div className="relative">
          <Input
            id="join-amount"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            disabled={disabled}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="h-12 pr-12 font-display text-lg tabular-nums"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">G$</span>
        </div>
        <p className={overBalance ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
          {account
            ? `Your wallet holds ${walletGd === undefined ? "…" : formatAmount(walletGd, decimals)} G$`
            : "Connect a wallet to see your G$ balance."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <Button
            key={c}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setAmount(c)}
            className="rounded-full tabular-nums"
          >
            {c} G$
          </Button>
        ))}
      </div>

      <div className="mt-5">
        {!account ? (
          <div className="flex flex-wrap items-center gap-3">
            <ConnectButton />
            <p className="text-xs text-muted-foreground">A wallet is needed to save G$.</p>
          </div>
        ) : (
          <Button variant="accent" size="lg" className="w-full" onClick={join} disabled={!canJoin}>
            {tx.pending ? <InlineSpinner label="Saving G$…" /> : "Save G$"}
          </Button>
        )}
      </div>

      {overBalance && <Notice tone="warning" className="mt-4">That is more than your wallet holds.</Notice>}
      {tx.error && (
        <Notice tone="danger" className="mt-4" title="Could not save">
          {tx.error}
        </Notice>
      )}
      {success && <Notice tone="success" className="mt-4">{success}</Notice>}
    </Card>
  );
}
