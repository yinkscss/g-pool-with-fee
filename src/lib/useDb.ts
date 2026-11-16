import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { collection, isPreview, sendEmailCode, sessionInfo, signIn as dbSignIn, signOut as dbSignOut, verifyEmailCode, type DbRecord, type DbWhere } from "./db";
import { errorMessage } from "./format";
import { subscribeWallet, walletState } from "./goodbuild/wallet";
import { useRead } from "./hooks";

// One sign-in for the whole app. Every useDbSession() reads the same state, so a sign-in button on
// one card updates the header, the page that decides what to show, and every list waiting on it.
interface SessionState {
  wallet: string | null;
  email: string | null;
  isOwner: boolean;
  emailSignIn: boolean;
  loading: boolean;
  codeSentTo: string | null;
}
let session: SessionState = { wallet: null, email: null, isOwner: false, emailSignIn: false, loading: true, codeSentTo: null };
const sessionListeners = new Set<() => void>();
let started = false;

function setSession(next: Partial<SessionState>) {
  session = { ...session, ...next };
  for (const listener of [...sessionListeners]) listener();
}
function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}
const readSession = () => session;

async function refreshSession() {
  const s = await sessionInfo();
  setSession({ wallet: s.wallet, email: s.email, isOwner: s.owner, emailSignIn: s.emailSignIn });
}

/** Read the session once for the whole app, and end a wallet sign-in when the wallet changes. */
function startSession() {
  if (started) return;
  started = true;
  refreshSession().catch(() => setSession({ wallet: null })).finally(() => setSession({ loading: false }));
  // Switching or disconnecting the wallet ends a wallet sign-in, on the server too, so a reload
  // doesn't bring it back. No wallet connected yet doesn't: the session outlives the page, and the
  // wallet reconnects a moment after it loads. An email sign-in has no wallet here, so it's untouched.
  let last = (walletState().account ?? "").toLowerCase();
  subscribeWallet(() => {
    const account = (walletState().account ?? "").toLowerCase();
    if (account === last) return;
    last = account;
    if (!session.wallet || session.wallet === account) return;
    setSession({ wallet: null, isOwner: isPreview });
    void dbSignOut().catch(() => {});
  });
}

/**
 * Who is signed in to this app's saved data. Separate from useWallet: connecting a wallet only shows
 * its address, signing in proves it. If the visitor switches account, they must sign in again.
 * Call it in as many components as you like: they all share one sign-in.
 */
export function useDbSession() {
  const state = useSyncExternalStore(subscribeSession, readSession, readSession);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startSession();
  }, []);

  /** Run one step, keeping signingIn and error in step. */
  const step = useCallback(async (run: () => Promise<void>) => {
    setSigningIn(true);
    setError(null);
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSigningIn(false);
    }
  }, []);

  /** Wallet sign-in: connect if needed, then one signature (no transaction, no gas). */
  const signIn = useCallback(() => step(async () => {
    await dbSignIn();
    await refreshSession();
  }), [step]);

  /** Email sign-in, step 1: send the code. Then show a code box and call confirmCode. */
  const sendCode = useCallback((address: string) => step(async () => {
    await sendEmailCode(address);
    setSession({ codeSentTo: address.trim().toLowerCase() });
  }), [step]);

  /** Email sign-in, step 2: the 6 digits from the email. */
  const confirmCode = useCallback((code: string) => step(async () => {
    const sentTo = session.codeSentTo;
    if (!sentTo) throw new Error("Ask for a code first.");
    await verifyEmailCode(sentTo, code);
    setSession({ codeSentTo: null });
    await refreshSession();
  }), [step]);

  const signOut = useCallback(async () => {
    setError(null);
    await dbSignOut().catch(() => {});
    setSession({ wallet: null, email: null, codeSentTo: null, isOwner: isPreview });
  }, []);

  /**
   * signedIn: by wallet or by email. Use it for enabled, not wallet, so email visitors see their records.
   * isOwner: the app's owner is signed in (always in the preview), so show the owner view behind it.
   * emailSignIn: this app offers email codes. codeSentTo: an address is waiting for its code.
   */
  const { wallet, email, isOwner, emailSignIn, loading, codeSentTo } = state;
  const signedIn = Boolean(wallet || email);
  return { wallet, email, signedIn, isOwner, emailSignIn, loading, signingIn, codeSentTo, error, signIn, sendCode, confirmCode, signOut, isPreview };
}

/**
 * The records of one collection, newest first, with loading and error state. Pass enabled=false to
 * wait (a private collection needs a signed-in wallet). Writes refresh the list; they throw on
 * failure, so wrap them in try/catch and show errorMessage(e).
 *   const notes = useCollection<Note>("notes", { enabled: session.signedIn, wallet: session.wallet ?? session.email });
 *   await notes.add({ text });
 */
export function useCollection<T>(
  name: string,
  options: { owner?: string; limit?: number; enabled?: boolean; wallet?: string | null; where?: DbWhere[]; orderBy?: string; dir?: "asc" | "desc"; liveEvery?: number } = {},
) {
  const { owner, limit, enabled = true, wallet, where, orderBy, dir, liveEvery } = options;
  const store = collection<T>(name);
  const queryKey = JSON.stringify([where ?? [], orderBy ?? "", dir ?? ""]);
  const read = useRead(() => store.list({ owner, limit, where, orderBy, dir }), [name, owner, limit, wallet, queryKey], enabled);
  // Live apps (a lobby, a turn-based game): fetch again every few seconds while the page is showing.
  const refreshRef = useRef(read.refresh);
  refreshRef.current = read.refresh;
  useEffect(() => {
    if (!enabled || !liveEvery) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshRef.current();
    }, Math.max(2_000, liveEvery));
    return () => clearInterval(timer);
  }, [enabled, liveEvery]);
  // Not while disabled, so one visitor's records don't stay on screen after they sign out.
  const records: DbRecord<T>[] = enabled ? read.data?.records ?? [] : [];

  async function after<R>(write: Promise<R>): Promise<R> {
    const result = await write;
    await read.refresh();
    return result;
  }
  return {
    records,
    /** True when the server read only the newest 500 records for this filtered or ordered list. */
    truncated: enabled ? read.data?.truncated === true : false,
    loading: read.loading,
    error: read.error,
    refresh: read.refresh,
    add: (value: T) => after(store.add(value)),
    put: (key: string, value: T) => after(store.put(key, value)),
    remove: (key: string, owner?: string | null) => after(store.remove(key, { owner })),
  };
}
