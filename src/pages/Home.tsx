import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, NotebookPen, ShieldCheck, Users } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Notice } from "../components/ui/notice";
import { Avatar } from "../components/ui/avatar";
import { PoolStats } from "../components/PoolStats";
import { usePool } from "../lib/usePool";
import { useWallet } from "../lib/useWallet";
import { useCollection } from "../lib/useDb";
import { formatAmount } from "../lib/format";
import { shortAddress } from "../lib/utils";
import { Reveal } from "../fx/Reveal";

type Profile = { name?: string; note?: string };

/** The front door: what Kolo Circle is, the live pool numbers, and the way in. */
export default function Home() {
  const { account } = useWallet();
  const pool = usePool(account ?? undefined);
  const live = !!pool.address;
  const profiles = useCollection<Profile>("profiles", { limit: 4 });

  useEffect(() => {
    document.title = "Kolo Circle · a G$ savings pool on Celo";
  }, []);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-border bg-background p-5 sm:p-8">
        <div className="relative">
          <Badge tone="success" className="rounded-full">
            <ShieldCheck className="mr-1 size-3.5" /> Your own money, your own exit
          </Badge>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Save G$ together, take yours back whenever you want.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A shared savings pool on Celo. Members join with G$ and every member can pull their own balance out again.
            The owner may keep an exit fee of up to 5%, never more.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/pool">
              <Button variant="accent" size="lg">
                Join the pool <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="lg">
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {!live && (
        <Notice tone="info" title="Deploy the contract to go live">
          The pool contract is not on chain yet, so the numbers below stay empty. Deploy SavingsPool with the G$ address
          and this page starts showing real figures.
        </Notice>
      )}
      {pool.error && (
        <Notice tone="danger" title="Could not read the pool">
          {pool.error}
        </Notice>
      )}

      <Reveal>
        <PoolStats
          loading={pool.loading}
          decimals={pool.decimals}
          total={pool.total}
          members={pool.members}
          feeBps={pool.feeBps}
          live={live}
        />
      </Reveal>

      {account && live && (
        <Reveal>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your savings</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
              {formatAmount(pool.held, pool.decimals)} G$
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pool.share !== undefined ? `${(Number(pool.share) / 100).toFixed(2)}% of the pool · ` : ""}
              {shortAddress(account)}
            </p>
          </Card>
        </Reveal>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link to="/pool" className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent">
          <ShieldCheck className="size-5 text-accent" />
          <h2 className="mt-3 font-display text-base font-semibold">Save or take out</h2>
          <p className="mt-1 text-sm text-muted-foreground">Join with any amount of G$ and take yours out again.</p>
        </Link>
        <Link to="/members" className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent">
          <Users className="size-5 text-accent" />
          <h2 className="mt-3 font-display text-base font-semibold">Know your circle</h2>
          <p className="mt-1 text-sm text-muted-foreground">Members add a name and a short note to the directory.</p>
        </Link>
        <Link to="/journal" className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent">
          <NotebookPen className="size-5 text-accent" />
          <h2 className="mt-3 font-display text-base font-semibold">Private journal</h2>
          <p className="mt-1 text-sm text-muted-foreground">Keep notes on what you save, only your wallet can read them.</p>
        </Link>
      </section>

      <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">In the circle</h2>
          <Link to="/members" className="text-sm font-medium text-accent underline underline-offset-2">
            All members
          </Link>
        </div>
        {profiles.loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading members…</p>
        ) : profiles.records.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nobody has introduced themselves yet. <Link to="/members" className="font-medium text-accent underline underline-offset-2">Be the first</Link>.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {profiles.records.map((r) => (
              <li key={r.key} className="flex items-center gap-3 py-3">
                <Avatar name={r.value.name} address={r.owner ?? r.key} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.value.name || shortAddress(r.owner ?? "")}</p>
                  {r.value.note && <p className="truncate text-xs text-muted-foreground">{r.value.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold">How the pool works</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Join in one tap: your wallet sends G$ straight into your own line in the pool.</li>
          <li>Take out any amount up to your own deposit. Nobody can take out someone else's G$.</li>
          <li>If the owner sets an exit fee, it comes out of the amount you withdraw and goes to the owner. The maximum is 5%.</li>
        </ul>
      </section>
    </div>
  );
}
