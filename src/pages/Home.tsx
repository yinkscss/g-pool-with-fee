import { Landmark, PiggyBank, ShieldCheck } from "lucide-react";
import { Badge } from "../components/ui/badge";
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

export default function Home() {
  const { account } = useWallet();
  const pool = usePool(account ?? undefined);
  const live = !!pool.address;

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
              <PiggyBank className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">Kolo Circle</p>
              <p className="text-xs text-muted-foreground">G$ savings pool · Celo</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 py-7 sm:py-10">
        <section>
          <Badge tone="success" className="rounded-full">
            <ShieldCheck className="mr-1 size-3.5" /> Your own money, your own exit
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Save G$ together, take yours back whenever you want.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A shared pool on Celo. Members add G$ with joinPool, and every member can pull their own balance out with
            exitPool. The pool owner may keep an exit fee of up to 5%, never more.
          </p>
        </section>

        {!live && (
          <Notice tone="info" title="Deploy the contract to go live">
            The pool contract is not on chain yet. Deploy SavingsPool with the G$ address, then the numbers and buttons
            here start working.
          </Notice>
        )}
        {pool.error && (
          <Notice tone="danger" title="Could not read the pool">
            {pool.error}
          </Notice>
        )}

        <PoolStats
          loading={pool.loading}
          decimals={pool.decimals}
          total={pool.total}
          members={pool.members}
          feeBps={pool.feeBps}
          live={live}
        />

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

        {account && (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your savings</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {live ? `${formatAmount(pool.held, pool.decimals)} G$` : <span className="text-muted-foreground">— G$</span>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {live && pool.share !== undefined ? `${(Number(pool.share) / 100).toFixed(2)}% of the pool` : "Your share appears once the pool is live."}
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
        )}

        <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Landmark className="size-4 text-accent" />
            How the pool works
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>Save G$ in one tap: your wallet sends it straight into your own line in the pool.</li>
            <li>Take out any amount up to your own deposit. Nobody can take out someone else's G$.</li>
            <li>
              If the owner sets an exit fee, it is taken from the amount you withdraw and paid to{" "}
              {pool.owner ? shortAddress(pool.owner) : "the owner"}. The maximum is 5%.
            </li>
          </ul>
        </section>
      </main>

      <footer className="mx-auto max-w-3xl px-5 pb-10 text-xs text-muted-foreground">
        Kolo Circle runs on Celo and saves in G$ (GoodDollar). Every deposit and withdrawal stays on Celo mainnet.
      </footer>
    </div>
  );
}
