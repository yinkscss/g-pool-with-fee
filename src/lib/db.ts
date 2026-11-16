import { createWalletClient, custom, getAddress } from "viem";
import { appChain as chain, connectWallet, hasWallet, walletProvider } from "./goodbuild/wallet";
import rules from "./dataRules.json";

/**
 * Saved data for this app, kept on GoodBuild's servers once the app is published. Visitors sign in
 * with their wallet (a signature, no transaction and no gas). src/lib/dataRules.json says, for each
 * collection, who can add, read and delete records, which fields everyone sees, and which values
 * must be unique. A collection with "create": "anyone" takes records from visitors who never sign in.
 * In the preview nothing reaches a server: records stay in this browser, sign-in needs no signature,
 * and you are treated as the app's owner so you can see what visitors would send you.
 */
export interface DbRecord<T = unknown> {
  key: string;
  /** Who wrote it: a wallet, or "anon:..." for a visitor who didn't sign in. Null when you only see its public fields. */
  owner: string | null;
  value: T;
  public: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbPage<T = unknown> {
  records: DbRecord<T>[];
  nextCursor: string | null;
  /** Set on a filtered list when there were more matching records than were returned, or older ones weren't read. */
  truncated?: boolean;
}

/** One condition on a record's fields. Only fields you can see are compared. */
export type DbWhere = [field: string, op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte", value: string | number | boolean];

export interface DbListOptions {
  owner?: string;
  limit?: number;
  cursor?: string;
  /** Keep only records whose fields pass every condition (up to 4), e.g. [["status", "eq", "open"], ["score", "gte", 10]]. */
  where?: DbWhere[];
  /** Sort by a field of the value, or "createdAt" / "updatedAt". Default: newest first. */
  orderBy?: string;
  dir?: "asc" | "desc";
  /** Only records saved or changed after this time (an ISO date or milliseconds). For polling a live app. */
  since?: string | number;
}

export class DbError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const BASE = "/__gb/data/v1";
const clientId = typeof document === "undefined" ? null : document.querySelector('meta[name="goodbuild-data"]')?.getAttribute("content") ?? null;

/** True in the GoodBuild preview, where saved data stays in this browser. */
export const isPreview = !clientId;

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { "x-gb-client": clientId ?? "", ...(init.body ? { "content-type": "application/json" } : {}) },
    });
  } catch {
    throw new DbError("network", "Couldn't reach the server. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!res.ok) throw new DbError(body?.error ?? "error", body?.message ?? "Something went wrong. Try again.", res.status);
  return body as T;
}

function signInMessage(a: { domain: string; address: string; uri: string; nonce: string }) {
  return [
    a.domain + " wants you to sign in with your Ethereum account:",
    a.address,
    "",
    "Sign in to this app. This isn't a transaction and costs no gas.",
    "",
    "URI: " + a.uri,
    "Version: 1",
    "Chain ID: " + chain.id,
    "Nonce: " + a.nonce,
    "Issued At: " + new Date().toISOString(),
  ].join("\n");
}

// --- The preview's stand-in: same behaviour, in this browser only -------------------------------

type Stored = DbRecord & { collection: string };
const PREVIEW_KEY = "goodbuild-preview-data";
const PREVIEW_VISITOR = "0x000000000000000000000000000000000000dead";
let previewWallet: string | null = null;
const previewRecords = (): Stored[] => {
  try {
    return JSON.parse(localStorage.getItem(PREVIEW_KEY) ?? "[]") as Stored[];
  } catch {
    return [];
  }
};
const savePreview = (records: Stored[]) => {
  try {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(records));
  } catch {
    // Private windows may refuse. Nothing else depends on it.
  }
};
type Rule = { create: string; read: string[]; public: string[]; fields: Record<string, string> | null; unique: string[] };
/** The same reading of dataRules.json as the server's, for the preview. */
function ruleOf(name: string): Rule {
  const raw = (rules as { collections?: Record<string, unknown> }).collections?.[name];
  const base: Rule = { create: "signed-in", read: ["writer"], public: [], fields: null, unique: [] };
  if (raw === "public-read") return { ...base, read: ["anyone"] };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<Record<keyof Rule, unknown>>;
  const arr = (v: unknown, d: string[]) => (typeof v === "string" ? [v] : Array.isArray(v) ? (v as string[]) : d);
  return { create: typeof r.create === "string" ? r.create : "signed-in", read: arr(r.read, ["writer"]), public: arr(r.public, []), fields: (r.fields as Record<string, string>) ?? null, unique: arr(r.unique, []) };
}
const PREVIEW_ANON = "anon:00000000-0000-4000-8000-000000000000";
const PREVIEW_EMAIL_ID = "email:00000000-0000-4000-8000-000000000001";
let previewEmail: string | null = null;
/** Who the preview's visitor is: their wallet, their email id, or nobody. */
const previewSubject = () => previewWallet ?? (previewEmail ? PREVIEW_EMAIL_ID : null);
const emailOffered = () => (rules as { signIn?: { email?: unknown } }).signIn?.email === true;

/** A key for a new record in the preview. crypto.randomUUID only exists on https and localhost pages, so plain http previews make one from random bytes. */
function newRecordKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
}

/** The default note never replaces a more specific one, such as the email sign-in note. */
function showPreviewNote(special?: string) {
  const text = special ?? "Preview: saved data stays in this browser. It's stored for real once you publish.";
  const existing = document.querySelector("[data-goodbuild-preview-note]");
  if (existing) {
    if (special) existing.textContent = special;
    return;
  }
  const note = document.createElement("div");
  note.setAttribute("data-goodbuild-preview-note", "");
  note.setAttribute("role", "note");
  note.textContent = text;
  note.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:9999;max-width:calc(100vw - 16px);padding:6px 10px;border-radius:8px;font:500 12px/1.4 system-ui,sans-serif;background:#1a0d26;color:#fff";
  document.body.appendChild(note);
}

function requirePreviewWallet(): string {
  if (!previewWallet) throw new DbError("unauthenticated", "Connect your wallet and sign in first.", 401);
  return previewWallet;
}

function previewPut<T>(collection: string, key: string, value: T): DbRecord<T> {
  const rule = ruleOf(collection);
  const owner = previewSubject() ?? (rule.create === "anyone" ? PREVIEW_ANON : requirePreviewWallet());
  showPreviewNote();
  const now = new Date().toISOString();
  const all = previewRecords();
  const found = all.find((r) => r.key === key && r.owner === owner && r.collection === collection);
  const v = value as unknown as Record<string, unknown>;
  if (rule.fields && v && typeof v === "object") {
    const extra = Object.keys(v).filter((f) => !(f in rule.fields!));
    if (extra.length) throw new DbError("invalid_value", "These fields aren't part of this collection: " + extra.join(", ") + ".", 400);
  }
  if (rule.unique.length && all.some((r) => r.collection === collection && r !== found && rule.unique.every((f) => JSON.stringify((r.value as Record<string, unknown>)?.[f]) === JSON.stringify(v?.[f])))) {
    throw new DbError("duplicate", "That " + rule.unique.join(" and ") + " is already taken.", 409);
  }
  const record: DbRecord<T> & { collection: string } = { key, owner, value, public: rule.read.includes("anyone"), createdAt: found?.createdAt ?? now, updatedAt: now, collection };
  savePreview([record, ...all.filter((r) => r !== found)]);
  return record;
}

/** In the preview you are the owner, so you see what the owner would. */
function previewVisible(collection: string, owner?: string): DbRecord[] {
  const rule = ruleOf(collection);
  return previewRecords()
    .filter((r) => r.collection === collection)
    .map((r) => (rule.read.some((x) => x === "anyone" || x === "owner" || (x === "signed-in" && previewSubject()) || (x === "writer" && r.owner === (previewSubject() ?? PREVIEW_ANON))) ? r : null))
    .filter((r): r is Stored => r !== null && (!owner || r.owner === owner.toLowerCase()));
}

/** The preview's version of a filtered list, the same comparisons the server makes. */
function previewList<T>(name: string, options: DbListOptions, since: number | undefined): DbPage<T> {
  let records = previewVisible(name, options.owner) as DbRecord<T>[];
  if (since !== undefined) records = records.filter((r) => Date.parse(r.updatedAt) > since);
  for (const [field, op, expected] of options.where ?? []) {
    records = records.filter((r) => {
      const v = r.value as unknown as Record<string, unknown> | null;
      if (!v || typeof v !== "object" || !(field in v) || typeof v[field] !== typeof expected) return false;
      const got = v[field] as string | number;
      const want = expected as string | number;
      return op === "eq" ? got === want : op === "ne" ? got !== want : op === "gt" ? got > want : op === "gte" ? got >= want : op === "lt" ? got < want : got <= want;
    });
  }
  if (options.orderBy) {
    const sign = options.dir === "asc" ? 1 : -1;
    const keyOf = (r: DbRecord<T>): string | number | boolean | null => {
      if (options.orderBy === "createdAt" || options.orderBy === "updatedAt") return Date.parse(r[options.orderBy]);
      const x = (r.value as unknown as Record<string, unknown> | null)?.[options.orderBy!];
      return typeof x === "string" || typeof x === "number" || typeof x === "boolean" ? x : null;
    };
    records = [...records].sort((a, b) => {
      const x = keyOf(a);
      const y = keyOf(b);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      if (typeof x !== typeof y) return typeof x < typeof y ? -sign : sign;
      return x === y ? 0 : x < y ? -sign : sign;
    });
  }
  const limit = options.limit ?? 50;
  return { records: records.slice(0, limit), nextCursor: null, ...(options.where?.length || options.orderBy || since !== undefined ? { truncated: records.length > limit } : {}) };
}

// --- The API ------------------------------------------------------------------------------------

export interface DbSessionInfo {
  /** The signed-in wallet, or null (also null for someone signed in by email). */
  wallet: string | null;
  /** The address of someone signed in by email, or null. Only they ever see it. */
  email: string | null;
  signedIn: boolean;
  /** The app's owner is signed in (always true in the preview). */
  owner: boolean;
  /** This app offers email sign-in ("signIn": {"email": true} in dataRules.json). */
  emailSignIn: boolean;
}

/** Everything about who is signed in to this app, in one request. */
export async function sessionInfo(): Promise<DbSessionInfo> {
  if (isPreview) {
    const subject = previewSubject();
    return { wallet: previewWallet, email: previewWallet ? null : previewEmail, signedIn: Boolean(subject), owner: true, emailSignIn: emailOffered() };
  }
  const s = await api<Partial<DbSessionInfo>>("/session");
  return { wallet: s.wallet ?? null, email: s.email ?? null, signedIn: Boolean(s.signedIn ?? s.wallet), owner: s.owner === true, emailSignIn: s.emailSignIn === true };
}

/**
 * Email sign-in, step 1: send a 6-digit code to this address. Only in apps whose dataRules.json has
 * "signIn": {"email": true}. Throws with a message you can show (a wrong address, too many codes).
 */
export async function sendEmailCode(email: string): Promise<void> {
  if (isPreview) {
    showPreviewNote("Preview: no email is sent. Any 6-digit code signs you in.");
    if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email.trim())) throw new DbError("invalid_email", "Enter one email address, like ada@example.com.", 400);
    return;
  }
  await api("/session/email", { method: "POST", body: JSON.stringify({ email }) });
}

/** Email sign-in, step 2: the code from the email. Returns the address now signed in. */
export async function verifyEmailCode(email: string, code: string): Promise<string> {
  const clean = code.replace(/s+/g, "");
  if (isPreview) {
    if (!/^[0-9]{6}$/.test(clean)) throw new DbError("code_invalid", "Enter the 6-digit code from the email.", 401);
    previewWallet = null;
    previewEmail = email.trim().toLowerCase();
    return previewEmail;
  }
  return (await api<{ email: string }>("/session/email/verify", { method: "POST", body: JSON.stringify({ email, code: clean }) })).email;
}

/** True when the signed-in wallet owns this app on GoodBuild. Always true in the preview. */
export async function isAppOwner(): Promise<boolean> {
  if (isPreview) return true;
  return (await api<{ owner?: boolean }>("/session")).owner === true;
}

/** The wallet signed in to this app, or null. */
export async function currentWallet(): Promise<string | null> {
  if (isPreview) return previewWallet;
  return (await api<{ wallet: string | null }>("/session")).wallet;
}

/** Connect the wallet if needed and sign in to this app. Returns the wallet address. */
export async function signIn(): Promise<string> {
  if (isPreview) {
    showPreviewNote();
    previewWallet = (hasWallet() ? await connectWallet().catch(() => PREVIEW_VISITOR) : PREVIEW_VISITOR).toLowerCase();
    return previewWallet;
  }
  const account = getAddress(await connectWallet());
  const { nonce, domain, uri } = await api<{ nonce: string; domain: string; uri: string }>("/session/nonce");
  const message = signInMessage({ domain, address: account, uri, nonce });
  const wallet = createWalletClient({ account, chain, transport: custom(walletProvider()!) });
  const signature = await wallet.signMessage({ message });
  return (await api<{ wallet: string }>("/session", { method: "POST", body: JSON.stringify({ message, signature }) })).wallet;
}

export async function signOut(): Promise<void> {
  if (isPreview) {
    previewWallet = null;
    previewEmail = null;
    return;
  }
  await api("/session", { method: "DELETE" });
}

/** Delete everything this wallet saved in this app, and sign out. */
export async function deleteMyData(): Promise<void> {
  if (isPreview) {
    const owner = requirePreviewWallet();
    savePreview(previewRecords().filter((r) => r.owner !== owner));
    previewWallet = null;
    return;
  }
  await api("/me", { method: "DELETE" });
}

/** One named collection. Names use lowercase letters, numbers, - and _, and start with a letter. */
export function collection<T = unknown>(name: string) {
  const path = "/c/" + encodeURIComponent(name);
  return {
    /** Newest first: what the rules let you read, in full or only its public fields. */
    async list(options: DbListOptions = {}): Promise<DbPage<T>> {
      // The server reads 1 to 100 records at a time: ask for more and get the most it gives, not an error.
      if (options.limit !== undefined) options = { ...options, limit: Math.max(1, Math.min(100, Math.floor(options.limit) || 1)) };
      const since = options.since === undefined ? undefined : typeof options.since === "number" ? options.since : Date.parse(options.since);
      if (since !== undefined && !Number.isFinite(since)) throw new DbError("invalid_query", "since must be a date or a number of milliseconds.", 400);
      if (isPreview) {
        showPreviewNote();
        return previewList<T>(name, options, since);
      }
      const query = new URLSearchParams();
      if (options.owner) query.set("owner", options.owner);
      if (options.limit) query.set("limit", String(options.limit));
      if (options.cursor) query.set("cursor", options.cursor);
      for (const [field, op, value] of options.where ?? []) query.append("where", field + "~" + op + "~" + JSON.stringify(value));
      if (options.orderBy) query.set("order", options.orderBy);
      if (options.dir) query.set("dir", options.dir);
      if (since !== undefined) query.set("since", String(Math.floor(since)));
      const text = query.toString();
      return api<DbPage<T>>(path + (text ? "?" + text : ""));
    },
    /** One record, or null. Without owner, your own. */
    async get(key: string, options: { owner?: string } = {}): Promise<DbRecord<T> | null> {
      if (isPreview) {
        showPreviewNote();
        const owner = options.owner?.toLowerCase() ?? previewWallet;
        return (previewVisible(name).find((r) => r.key === key && r.owner === owner) as DbRecord<T> | undefined) ?? null;
      }
      try {
        return await api<DbRecord<T>>(path + "/" + encodeURIComponent(key) + (options.owner ? "?owner=" + options.owner : ""));
      } catch (e) {
        if (e instanceof DbError && e.status === 404) return null;
        throw e;
      }
    },
    /** Save under a key you choose, replacing your earlier record with that key. Other wallets' records with the same key are separate. */
    async put(key: string, value: T): Promise<DbRecord<T>> {
      if (isPreview) return previewPut(name, key, value);
      return api<DbRecord<T>>(path + "/" + encodeURIComponent(key), { method: "PUT", body: JSON.stringify({ value }) });
    },
    /** Save a new record with a generated key. Works without sign-in where the rule says "create": "anyone". */
    async add(value: T): Promise<DbRecord<T>> {
      if (isPreview) return previewPut(name, newRecordKey(), value);
      return api<DbRecord<T>>(path, { method: "POST", body: JSON.stringify({ value }) });
    },
    /** Delete your own record. The app's owner can pass owner to delete someone else's, where the rule allows it. */
    async remove(key: string, options: { owner?: string | null } = {}): Promise<void> {
      if (isPreview) {
        const owner = options.owner ?? previewSubject() ?? PREVIEW_ANON;
        savePreview(previewRecords().filter((r) => !(r.key === key && r.owner === owner && r.collection === name)));
        return;
      }
      await api(path + "/" + encodeURIComponent(key) + (options.owner ? "?owner=" + encodeURIComponent(options.owner) : ""), { method: "DELETE" });
    },
  };
}
