import { useEffect, useState } from "react";
import { Loader2, Lock, NotebookPen, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Notice } from "../components/ui/notice";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import { useCollection, useDbSession } from "../lib/useDb";
import { deleteMyData } from "../lib/db";
import { errorMessage } from "../lib/format";
import { shortAddress } from "../lib/utils";

type Note = { text: string; amount: string; date: string };

/** Private savings notes: only the wallet that wrote a note can read it. */
export default function Journal() {
  const session = useDbSession();
  const notes = useCollection<Note>("journal", { enabled: session.signedIn, wallet: session.wallet });

  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Journal · Kolo Circle";
  }, []);

  async function add() {
    setError(null);
    setSaved(null);
    if (!text.trim()) {
      setError("Write a note first.");
      return;
    }
    setSaving(true);
    try {
      await notes.add({
        text: text.trim().slice(0, 500),
        amount: amount.trim().replace(/[^0-9.]/g, "").slice(0, 20),
        date: new Date().toISOString(),
      });
      setText("");
      setAmount("");
      setSaved("Note saved. Only your wallet can read it.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(key: string) {
    setError(null);
    setSaved(null);
    setBusyKey(key);
    try {
      await notes.remove(key);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteAll() {
    setError(null);
    setSaved(null);
    try {
      await deleteMyData();
      await notes.refresh();
      setSaved("Everything this wallet saved in the app was deleted.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Your savings journal</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          What you are saving for, and how it is going. Notes are tied to your wallet and only that wallet can read them;
          they are not on chain.
        </p>
      </section>

      {session.loading ? (
        <Skeleton className="h-48 w-full" />
      ) : !session.signedIn ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Lock className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">A private notebook</h2>
              <p className="text-sm text-muted-foreground">Sign in with your wallet to start your journal.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={session.signIn} disabled={session.signingIn}>
              {session.signingIn ? <Loader2 className="size-4 animate-spin" /> : <NotebookPen className="size-4" />}
              {session.signingIn ? "Waiting for signature…" : "Sign in to open it"}
            </Button>
            <p className="text-xs text-muted-foreground">One signature, no transaction, no gas.</p>
          </div>
          {session.error && (
            <Notice tone="danger" className="mt-4" title="Could not sign in">
              {session.error}
            </Notice>
          )}
          {session.isPreview && (
            <p className="mt-3 text-xs text-muted-foreground">
              Preview: sign-in is skipped and notes stay in this browser only.
            </p>
          )}
        </Card>
      ) : (
        <>
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">New note</h2>
            <p className="mt-1 text-sm text-muted-foreground">Signed in as {shortAddress(session.wallet ?? "")}.</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note-text">What happened</Label>
                <Textarea
                  id="note-text"
                  rows={3}
                  maxLength={500}
                  value={text}
                  disabled={saving}
                  placeholder="Joined the circle with 500 G$ this week, on track for the December target."
                  onChange={(e) => setText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{text.length}/500</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-amount">Amount saved (optional)</Label>
                <div className="relative">
                  <Input
                    id="note-amount"
                    inputMode="decimal"
                    value={amount}
                    disabled={saving}
                    placeholder="500"
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="pr-12 tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    G$
                  </span>
                </div>
              </div>
              <Button variant="accent" onClick={add} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {saving ? "Saving…" : "Save note"}
              </Button>
              {error && (
                <Notice tone="danger" title="Could not save">
                  {error}
                </Notice>
              )}
              {saved && <Notice tone="success">{saved}</Notice>}
            </div>
          </Card>

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <h2 className="font-display text-base font-semibold">Your notes</h2>
            {notes.loading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : notes.error ? (
              <Notice tone="danger" className="mt-4" title="Could not load your notes">
                {notes.error}
              </Notice>
            ) : notes.records.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No notes yet. The first one is the hardest.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {notes.records.map((r) => (
                  <li key={r.key} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="whitespace-pre-line text-sm leading-relaxed">{r.value.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {r.value.amount ? `${r.value.amount} G$ · ` : ""}
                        {new Date(r.value.date || r.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete note"
                      disabled={busyKey === r.key}
                      onClick={() => remove(r.key)}
                    >
                      {busyKey === r.key ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={deleteAll}>
                Delete all my saved data
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Removes your journal notes and your member profile from this app. Your G$ in the pool is untouched.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
