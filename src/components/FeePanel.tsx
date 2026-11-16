import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import type { Address } from "viem";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Notice } from "./ui/notice";
import { shortAddress } from "../lib/utils";
import { useTx } from "../lib/hooks";
import { writeContract } from "../lib/chain";
import { SavingsPoolAbi } from "../contracts";

type FeeProps = {
  owner?: Address;
  pool?: Address;
  account?: Address;
  feeBps?: bigint;
  live: boolean;
  onDone: () => void;
};

/** Owner-only panel: change the exit fee, capped at 5% by the contract. */
export function FeePanel({ owner, pool, account, feeBps, live, onDone }: FeeProps) {
  const [percent, setPercent] = useState("0");
  const [success, setSuccess] = useState<string | null>(null);
  const tx = useTx();

  useEffect(() => {
    if (feeBps !== undefined) setPercent(String(Number(feeBps) / 100));
  }, [feeBps]);

  const isOwner = !!account && !!owner && account.toLowerCase() === owner.toLowerCase();
  if (!isOwner) return null;

  const value = Number(percent);
  const valid = percent !== "" && !Number.isNaN(value) && value >= 0 && value <= 5;
  const current = feeBps === undefined ? "…" : `${Number(feeBps) / 100}%`;

  async function save() {
    if (!pool) return;
    setSuccess(null);
    const bps = BigInt(Math.round(value * 100));
    const receipt = await tx.run(() =>
      writeContract({
        address: pool,
        abi: SavingsPoolAbi,
        functionName: "setFee",
        args: [bps],
      }),
    );
    if (receipt) {
      setSuccess(`Exit fee is now ${value}%.`);
      onDone();
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-warning/10 text-warning">
          <Settings2 className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Owner settings</h2>
          <p className="text-sm text-muted-foreground">
            You own this pool ({shortAddress(owner)}). The exit fee is capped at 5%.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-32 flex-1 space-y-2">
          <Label htmlFor="fee">Exit fee, now {current}</Label>
          <div className="relative">
            <Input
              id="fee"
              inputMode="decimal"
              value={percent}
              disabled={!live || tx.pending}
              onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, ""))}
              className="h-11 pr-10 tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">%</span>
          </div>
        </div>
        <Button variant="default" onClick={save} disabled={!live || !valid || tx.pending}>
          {tx.pending ? "Saving…" : "Set fee"}
        </Button>
      </div>

      {!valid && percent !== "" && <p className="mt-2 text-xs text-danger">Enter a fee between 0 and 5.</p>}
      {tx.error && (
        <Notice tone="danger" className="mt-4" title="Could not set the fee">
          {tx.error}
        </Notice>
      )}
      {success && <Notice tone="success" className="mt-4">{success}</Notice>}
    </Card>
  );
}
