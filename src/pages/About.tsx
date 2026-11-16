import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PiggyBank } from "lucide-react";
import { Button } from "../components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

const FAQ = [
  {
    q: "What is G$?",
    a: "G$ (GoodDollar) is a digital dollar token on Celo, meant for everyday saving and spending. One G$ is designed to stay close to one US dollar, so what you save keeps its value better than cash.",
  },
  {
    q: "How do I join the pool?",
    a: "Connect a wallet on the Pool page, type an amount and press Save G$. Your wallet sends the G$ straight into the pool in one transaction, and the pool records that amount under your address.",
  },
  {
    q: "Can anyone take my G$ out?",
    a: "No. exitPool only ever moves the balance of the wallet calling it. The contract has no function that lets the owner move a member's balance, and the tests that check this run on every build.",
  },
  {
    q: "What is the exit fee?",
    a: "The owner can set a fee of up to 5% with setFee. When the fee is above zero, it is taken from the amount you withdraw and paid to the owner. The contract refuses any fee above 500 basis points.",
  },
  {
    q: "Do I need to take everything out at once?",
    a: "No. Withdraw any amount up to your own balance, as often as you like. The Take yours out card shows exactly what you would receive after the fee before you sign.",
  },
  {
    q: "What is saved off chain?",
    a: "Your member profile and your private journal notes. They are kept by GoodBuild's app data store, which means they can be removed and they are not proof of anything. Money and balances always live in the contract.",
  },
  {
    q: "Who can read my journal?",
    a: "Only the wallet that wrote the notes. Notes are tied to the signing wallet, so another wallet sees a different journal. You can delete any note, or all your saved data, from the Journal page.",
  },
  {
    q: "Why do I sign a message that costs nothing?",
    a: "Saving a profile or a note needs a signature to prove which wallet is yours. It is a signature, not a transaction: no gas, no G$ moves. Every actual deposit or withdrawal is a normal Celo transfer you sign in your wallet.",
  },
];

/** About and FAQ: how the pool works, in words a first-time wallet user can follow. */
export default function About() {
  useEffect(() => {
    document.title = "About · Kolo Circle";
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">About Kolo Circle</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          A kolo is the savings box many of us grew up with. Kolo Circle is the same idea for a group on Celo: everyone
          puts G$ into one pool, each member's share is recorded in a contract, and anyone can take their own share back
          out without asking permission.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">How it works</h2>
        <p>
          A <span className="text-foreground">wallet</span> is your account on Celo. It holds your G$ and signs every
          action, and only you hold its keys.
        </p>
        <p>
          Joining calls <span className="text-foreground">joinPool(amount)</span>, which pulls that amount of G$ from your
          wallet into the contract and adds it to your own line in the ledger.
        </p>
        <p>
          Leaving calls <span className="text-foreground">exitPool(amount)</span>, which pays your amount back to you,
          minus the current exit fee if the owner has set one.
        </p>
        <p>
          The owner's only power is <span className="text-foreground">setFee</span>, capped at 5% by the contract itself.
          There is no function to move a member's G$ to anyone else.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">What the app adds</h2>
        <p>
          On chain, the pool only knows addresses. The Members page lets each wallet add a name and a note so the circle
          has faces, and the Journal page keeps private notes about what you are saving for. Both are saved off chain,
          and neither ever touches your G$.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Questions</h2>
        <Accordion type="single" defaultValue="q-0" className="mt-3">
          {FAQ.map((item, i) => (
            <AccordionItem key={item.q} value={`q-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
            <PiggyBank className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold">Ready when you are</h2>
            <p className="text-sm text-muted-foreground">Join with any amount of G$, and take it back whenever you want.</p>
          </div>
        </div>
        <Link to="/pool" className="mt-4 inline-block">
          <Button variant="accent">
            Go to the pool <ArrowRight className="size-4" />
          </Button>
        </Link>
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        A pool that holds real money deserves a security review before it holds a lot of it. The contract is small and
        tested against the common attacks, which is not the same thing as an audit.
      </p>
    </div>
  );
}
