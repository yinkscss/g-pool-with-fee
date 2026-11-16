import { useEffect } from "react";
import { Link } from "react-router-dom";
import { NotebookPen, Users } from "lucide-react";
import { Notice } from "../components/ui/notice";
import { PoolStats } from "../components/PoolStats";
import { JoinCard } from "../components/JoinCard";
import { ExitCard } from "../components/ExitCard";
import { FeePanel } from "../components/FeePanel";
import { ConnectButton } from "../components/ConnectButton";
import { usePool } from "../lib/usePool";
import { useWallet } from "../lib/useWallet";
import { formatAmount } from "../lib/format";
import { shortAddress } from "../lib/utils";

/** The pool page: join with G$, take your own G$ out, and the owner's fee setting. */
export default function Pool() {
  const { account } = useWallet();
  const pool = usePool(account ?? undefined);
  const live = !!pool.address;

  useEffect(() => {
    document.title = "Pool · Kolo Circle";
  }, []);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">The pool</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Add G$ to your own line in the circle, and take back any amount of it whenever you like. The owner may keep an
          exit fee of up to 5%, never more.
        </p>
      </section>

      {!live && (
        <Notice tone="info" title="Deploy the contract to go live">
          The pool contract is not on chain yet. Deploy SavingsPool with the G$ address, then the numbers and buttons here
          start working.
        </Notice>
      )}
      {pool.error && (
        <Notice tone="danger" title="Could not read the pool">
          {pool.error}
        </Notice>
      )}

      {account ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your savings</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
              {live ? `${formatAmount(pool.held, pool.decimals)} G$` : <span className="text-muted-foreground">— G$</span>}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {live && pool.share !== undefined
                ? `${(Number(pool.share) / 100).toFixed(2)}% of the pool`
                : "Your share appears once the pool is live."}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In your wallet</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
              {pool.walletGd === undefined ? "…" : `${formatAmount(pool.walletGd, pool.decimals)} G$`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Connected as {shortAddress(account)}</p>
          </div>
        </section>
      ) : (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-5">
          <ConnectButton />
          <p className="text-xs text-muted-foreground">Connect a wallet to see your G$ and your savings here.</p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5">
        <JoinCard
          account={account ?? undefined}
          pool={pool.address}
          gd={pool.gd}
          decimals={pool.decimals}
          walletGd={pool.walletGd}
          live={live}
          onDone={pool.refresh}
        />
        <ExitCard
          account={account ?? undefined}
          pool={pool.address}
          decimals={pool.decimals}
          held={pool.held}
          feeBps={pool.feeBps}
          live={live}
          onDone={pool.refresh}
        />
        <FeePanel
          owner={pool.owner}
          pool={pool.address}
          account={account ?? undefined}
          feeBps={pool.feeBps}
          live={live}
          onDone={pool.refresh}
        />
      </div>

      <PoolStats
        loading={pool.loading}
        decimals={pool.decimals}
        total={pool.total}
        members={pool.members}
        feeBps={pool.feeBps}
        live={live}
      />

      <section className="flex flex-wrap gap-3">
        <Link
          to="/members"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
        >
          <Users className="size-4 text-accent" /> See who is in the circle
        </Link>
        <Link
          to="/journal"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
        >
          <NotebookPen className="size-4 text-accent" /> Write a private note
        </Link>
      </section>
    </div>
  );
}
