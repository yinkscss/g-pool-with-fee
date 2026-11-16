import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Notice } from "./ui/notice";
import { Badge } from "./ui/badge";
import { ConnectButton } from "./ConnectButton";
import { InlineSpinner } from "./PoolStats";
import { formatAmount } from "../lib/format";
import { useTx } from "../lib/hooks";
import { writeContract } from "../lib/chain";
import { SavingsPoolAbi } from "../contracts";

type ExitProps = {
  account?: Address;
  pool?: Address;
  decimals: number;
  held?: bigint;
  feeBps?: bigint;
  live: boolean;
  onDone: () => void;
};

/** Take your own G$ back out, minus the pool's current exit fee. */
export function ExitCard({ account, pool, decimals, held, feeBps, live, onDone }: ExitProps) {
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
  const own = held ?? 0n;
  const overBalance = parsed > own;
  const fee = ((parsed * (feeBps ?? 0n)) / 10000n);
  const payout = parsed > fee ? parsed - fee : 0n;
  const hasNothing = account !== undefined && held === 0n;
  const canExit = !!pool && live && parsed > 0n && !overBalance && !tx.pending;

  async function exit() {
    if (!pool) return;
    setSuccess(null);
    const receipt = await tx.run(() =>
      writeContract({
        address: pool,
        abi: SavingsPoolAbi,
        functionName: "exitPool",
        args: [parsed],
      }),
    );
    if (receipt) {
      setSuccess(`Took ${formatAmount(payout, decimals)} G$ back to your wallet.`);
      setAmount("");
      onDone();
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/5 text-primary">
            <ArrowUpFromLine className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Take yours out</h2>
            <p className="text-sm text-muted-foreground">Only your own balance leaves the pool.</p>
          </div>
        </div>
        {account && (
          <Badge tone="success">
            {held === undefined ? "…" : formatAmount(held, decimals)} G$ saved
          </Badge>
        )}
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="exit-amount">Amount</Label>
        <div className="relative">
          <Input
            id="exit-amount"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            disabled={!live || tx.pending}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="h-12 pr-12 font-display text-lg tabular-nums"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">G$</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            You receive {formatAmount(payout, decimals)} G$
            {fee > 0n ? ` · ${formatAmount(fee, decimals)} G$ exit fee` : " · no fee"}
          </span>
          {own > 0n && (
            <button
              type="button"
              className="font-medium text-accent underline underline-offset-2 disabled:opacity-50"
              disabled={!live || tx.pending}
              onClick={() => setAmount(formatAmount(own, decimals, decimals).replace(/,/g, ""))}
            >
              Use all
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        {!account ? (
          <div className="flex flex-wrap items-center gap-3">
            <ConnectButton />
            <p className="text-xs text-muted-foreground">Connect to see your share of the pool.</p>
          </div>
        ) : (
          <Button variant="default" size="lg" className="w-full" onClick={exit} disabled={!canExit}>
            {tx.pending ? <InlineSpinner label="Withdrawing…" /> : "Take out G$"}
          </Button>
        )}
      </div>

      {hasNothing && !tx.pending && (
        <p className="mt-3 text-xs text-muted-foreground">You have nothing in the pool yet. Join first, then take it back out whenever you like.</p>
      )}
      {overBalance && <Notice tone="warning" className="mt-4">You only have {formatAmount(own, decimals)} G$ in the pool.</Notice>}
      {tx.error && (
        <Notice tone="danger" className="mt-4" title="Could not withdraw">
          {tx.error}
        </Notice>
      )}
      {success && <Notice tone="success" className="mt-4">{success}</Notice>}
    </Card>
  );
}
