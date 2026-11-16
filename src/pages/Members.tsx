import { useEffect, useState } from "react";
import { Loader2, PenLine, Trash2, Users } from "lucide-react";
import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Notice } from "../components/ui/notice";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import { useCollection, useDbSession } from "../lib/useDb";
import { errorMessage } from "../lib/format";
import { shortAddress } from "../lib/utils";

type Profile = { name: string; note: string };

/** The directory: signed-in wallets add a name and a short note that everyone can read. */
export default function Members() {
  const session = useDbSession();
  const profiles = useCollection<Profile>("profiles");

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Members · Kolo Circle";
  }, []);

  const myWallet = (session.wallet ?? "").toLowerCase();
  const mine = profiles.records.find((r) => r.key === "profile" && r.owner && r.owner.toLowerCase() === myWallet);

  useEffect(() => {
    if (!mine) return;
    setName(mine.value.name ?? "");
    setNote(mine.value.note ?? "");
  }, [mine?.key, mine?.updatedAt]);

  async function save() {
    setError(null);
    setSaved(null);
    if (!name.trim()) {
      setError("Add a name so the circle knows who you are.");
      return;
    }
    setSaving(true);
    try {
      await profiles.put("profile", { name: name.trim().slice(0, 60), note: note.trim().slice(0, 160) });
      setSaved(mine ? "Your profile is updated." : "You are in the directory.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeMine() {
    setError(null);
    setSaved(null);
    setSaving(true);
    try {
      await profiles.remove("profile");
      setName("");
      setNote("");
      setSaved("Your profile was removed.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">The circle</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          A name and a short note, so a shared pool has faces behind it. Your G$ stays on chain in the pool; only the
          profile is saved here.
        </p>
      </section>

      {session.loading ? (
        <Skeleton className="h-40 w-full" />
      ) : !session.signedIn ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Users className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Add yourself to the circle</h2>
              <p className="text-sm text-muted-foreground">Sign in with your wallet to add a name and note.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={session.signIn} disabled={session.signingIn}>
              {session.signingIn ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
              {session.signingIn ? "Waiting for signature…" : "Sign in to add yourself"}
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
              Preview: sign-in is skipped and records stay in this browser only.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">{mine ? "Your profile" : "Add yourself"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {shortAddress(session.wallet ?? "")}. Everyone sees your name and note, and nobody sees your
            address next to them.
          </p>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={name}
                maxLength={60}
                placeholder="Ada from Yaba"
                disabled={saving}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-note">Short note</Label>
              <Textarea
                id="member-note"
                value={note}
                maxLength={160}
                rows={3}
                placeholder="Saving for a laptop, aiming for 20,000 G$ this year."
                disabled={saving}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{note.length}/160</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {saving ? "Saving…" : mine ? "Update profile" : "Add to the circle"}
              </Button>
              {mine && (
                <Button variant="outline" onClick={removeMine} disabled={saving}>
                  <Trash2 className="size-4" /> Remove
                </Button>
              )}
            </div>
            {error && (
              <Notice tone="danger" title="Could not save">
                {error}
              </Notice>
            )}
            {saved && <Notice tone="success">{saved}</Notice>}
          </div>
        </Card>
      )}

      <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Members</h2>
          {profiles.records.length > 0 && <span className="text-xs text-muted-foreground">{profiles.records.length}</span>}
        </div>
        {profiles.loading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : profiles.error ? (
          <Notice tone="danger" className="mt-4" title="Could not load the directory">
            {profiles.error}
          </Notice>
        ) : profiles.records.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No members have introduced themselves yet. Sign in above to be the first.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {profiles.records.map((r) => (
              <li key={r.key} className="flex items-start gap-3 py-3">
                <Avatar name={r.value.name} size={40} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.value.name || "Unnamed member"}</p>
                  {r.value.note && <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{r.value.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
