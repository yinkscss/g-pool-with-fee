import { PiggyBank, Users, Percent, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { formatAmount } from "../lib/format";

type Props = {
  loading: boolean;
  decimals: number;
  total?: bigint;
  members?: bigint;
  feeBps?: bigint;
  live: boolean;
};

function Stat({
  icon: Icon,
  label,
  value,
  loading,
  placeholder,
}: {
  icon: typeof PiggyBank;
  label: string;
  value?: string;
  loading: boolean;
  placeholder: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 text-accent" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-3 font-display text-2xl font-semibold tabular-nums">
          {value ?? <span className="text-muted-foreground">{placeholder}</span>}
        </p>
      )}
    </Card>
  );
}

/** The three numbers that describe the pool: total saved, members, exit fee. */
export function PoolStats({ loading, decimals, total, members, feeBps, live }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Stat
        icon={PiggyBank}
        label="In the pool"
        value={live ? `${formatAmount(total, decimals)} G$` : undefined}
        loading={loading}
        placeholder="— G$"
      />
      <Stat
        icon={Users}
        label="Members"
        value={live && members !== undefined ? members.toString() : undefined}
        loading={loading}
        placeholder="—"
      />
      <Stat
        icon={Percent}
        label="Exit fee"
        value={live && feeBps !== undefined ? `${(Number(feeBps) / 100).toFixed(2).replace(/\.00$/, "")}%` : undefined}
        loading={loading}
        placeholder="—"
      />
    </div>
  );
}

export function InlineSpinner({ label }: { label: string }) {
  return (
    <>
      <Loader2 className="size-4 animate-spin" />
      {label}
    </>
  );
}
