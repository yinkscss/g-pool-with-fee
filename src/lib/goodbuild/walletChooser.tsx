/**
 * Written by GoodBuild: the "Connect a wallet" list that connectWallet() opens. Don't edit it.
 * Styled with this app's theme colours (with fallbacks), so it fits any design.
 */
import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { createRoot } from "react-dom/client";
import type { Address } from "viem";
import type { WalletInfo } from "./wallet";

type Connect = (info: WalletInfo, onUri: (uri: string) => void) => Promise<Address>;

/**
 * Phone wallets that open a WalletConnect link. Formats follow each wallet's universal link plus
 * "/wc?uri=" (UNVERIFIED on real phones; see docs/HANDOFF.md). "Other wallet" opens the plain wc: link.
 */
export const PHONE_WALLETS: Array<{ name: string; link: string; hint?: string; iosOnly?: boolean }> = [
  { name: "MetaMask", link: "https://metamask.app.link/wc?uri=" },
  { name: "Valora", link: "https://valoraapp.com/wc?uri=" },
  { name: "Trust Wallet", link: "https://link.trustwallet.com/wc?uri=" },
  { name: "Rainbow", link: "https://rnbwapp.com/wc?uri=" },
  // OKX Wallet: RainbowKit's link for it (UNVERIFIED on real phones; OKX's docs describe only OKX Connect). It is a custom
  // scheme, not a web link, so a phone without the app does nothing: the hint says so. Android has no row of its own because
  // RainbowKit gives OKX the plain wc: link there, which is the "Other wallet" row.
  { name: "OKX Wallet", link: "okex://main/wc?uri=", hint: "Needs the OKX app", iosOnly: true },
];

export function isPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

const STYLE = [
  "[data-goodbuild-wallets]{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(17,17,17,.4);font-family:var(--font-sans,Inter,ui-sans-serif,system-ui,sans-serif);color:var(--color-foreground,#111)}",
  "@media (min-width:640px){[data-goodbuild-wallets]{align-items:center}}",
  ".gbw-panel{box-sizing:border-box;width:100%;max-width:400px;max-height:90vh;overflow:auto;margin:0;padding:24px;border-radius:24px 24px 0 0;background:var(--color-card,#fff);box-shadow:0 2px 6px rgba(17,17,17,.04),0 40px 80px -30px rgba(89,46,129,.3)}",
  "@media (min-width:640px){.gbw-panel{border-radius:24px;margin:16px}}",
  ".gbw-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}",
  ".gbw-title{margin:0;font-size:18px;font-weight:600}",
  ".gbw-close,.gbw-back{border:0;background:transparent;color:var(--color-muted-foreground,#7a7a7a);font:inherit;font-size:14px;cursor:pointer;padding:6px 8px;border-radius:9999px}",
  ".gbw-close:hover,.gbw-back:hover{background:var(--color-muted,#f5f5f5)}",
  ".gbw-list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}",
  ".gbw-row{box-sizing:border-box;display:flex;width:100%;align-items:center;gap:12px;padding:12px;border:1px solid var(--color-border,rgba(17,17,17,.08));border-radius:16px;background:var(--color-card,#fff);color:inherit;font:inherit;font-size:14px;font-weight:500;text-align:left;text-decoration:none;cursor:pointer}",
  ".gbw-row:hover{background:var(--color-muted,#f5f5f5)}",
  ".gbw-row:focus-visible,.gbw-close:focus-visible,.gbw-back:focus-visible,.gbw-copy:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(89,46,129,.18)}",
  ".gbw-row[disabled]{opacity:.6;cursor:default}",
  ".gbw-icon{width:32px;height:32px;flex:none;border-radius:10px;object-fit:contain;display:grid;place-items:center;font-weight:700;color:#fff;background:var(--color-accent,#592e81)}",
  ".gbw-hint{display:block;font-size:12px;font-weight:400;color:var(--color-muted-foreground,#7a7a7a)}",
  ".gbw-note{margin:12px 0 0;font-size:12px;line-height:1.5;color:var(--color-muted-foreground,#7a7a7a)}",
  ".gbw-error{margin:0 0 12px;padding:10px 12px;border-radius:12px;font-size:13px;background:rgba(210,56,75,.08);color:var(--color-danger,#d2384b)}",
  ".gbw-qr{display:grid;place-items:center;padding:16px;border-radius:16px;background:#fff;border:1px solid var(--color-border,rgba(17,17,17,.08))}",
  ".gbw-qr svg{display:block;width:100%;max-width:240px;height:auto}",
  ".gbw-copy{margin-top:12px;width:100%;padding:10px 12px;border:0;border-radius:9999px;background:var(--color-muted,#f5f5f5);color:inherit;font:inherit;font-size:13px;font-weight:500;cursor:pointer}",
].join("\n");

function addStyle() {
  if (document.getElementById("goodbuild-wallets-style")) return;
  const style = document.createElement("style");
  style.id = "goodbuild-wallets-style";
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function Icon({ info }: { info: { name: string; icon?: string | null } }) {
  if (info.icon) return <img className="gbw-icon" style={{ background: "transparent" }} src={info.icon} alt="" />;
  return (
    <span className="gbw-icon" aria-hidden="true">
      {info.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function message(e: unknown): string {
  const err = e as { code?: unknown; message?: string; shortMessage?: string } | undefined;
  if (err?.code === 4001 || /user (rejected|denied)/i.test(err?.message ?? "")) return "You cancelled the request in your wallet.";
  return (err?.shortMessage ?? err?.message ?? "Couldn't connect. Try again.").split("\n")[0];
}

type View = { step: "list" } | { step: "waiting"; name: string } | { step: "walletconnect"; uri: string | null };
type Qr = ComponentType<{ value: string }>;

export function WalletChooser({
  options,
  connect,
  onDone,
  onCancel,
  onBack,
  phone = isPhone(),
}: {
  options: WalletInfo[];
  connect: Connect;
  onDone: (account: Address) => void;
  onCancel: () => void;
  onBack?: () => void;
  phone?: boolean;
}) {
  const [view, setView] = useState<View>({ step: "list" });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [Qr, setQr] = useState<Qr | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const attempt = useRef(0);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [view.step]);

  async function pick(info: WalletInfo) {
    const id = ++attempt.current;
    setError(null);
    setCopied(false);
    if (info.kind === "walletconnect") {
      setView({ step: "walletconnect", uri: null });
      if (!phone) {
        import("./walletConnect").then((m) => setQr(() => m.QrCode as Qr)).catch(() => {});
      }
    } else {
      setView({ step: "waiting", name: info.name });
    }
    try {
      const account = await connect(info, (uri) => {
        if (attempt.current === id) {
          setCopied(false);
          setView({ step: "walletconnect", uri });
        }
      });
      if (attempt.current === id) onDone(account);
    } catch (e) {
      if (attempt.current !== id) return;
      setError(message(e));
      setView({ step: "list" });
    }
  }

  function back() {
    attempt.current++;
    onBack?.();
    setView({ step: "list" });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function copy(uri: string) {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const title = view.step === "walletconnect" ? (phone ? "Open your wallet" : "Scan with your phone") : "Connect a wallet";

  return (
    <div data-goodbuild-wallets="" onMouseDown={(e) => e.target === e.currentTarget && onCancel()} onKeyDown={onKeyDown}>
      <div ref={panel} className="gbw-panel" role="dialog" aria-modal="true" aria-labelledby="gbw-title">
        <div className="gbw-head">
          {view.step === "list" ? null : (
            <button type="button" className="gbw-back" onClick={back}>
              Back
            </button>
          )}
          <h2 id="gbw-title" className="gbw-title">
            {title}
          </h2>
          <button type="button" className="gbw-close" onClick={onCancel} aria-label="Close">
            Close
          </button>
        </div>

        {error ? (
          <p className="gbw-error" role="alert">
            {error}
          </p>
        ) : null}

        {view.step === "list" ? (
          <ul className="gbw-list">
            {options.map((info) => (
              <li key={info.id}>
                <button type="button" className="gbw-row" onClick={() => void pick(info)}>
                  <Icon info={info} />
                  <span>
                    {info.name}
                    <span className="gbw-hint">{info.kind === "walletconnect" ? (phone ? (isIos() ? "MetaMask, Valora, OKX and other phone wallets" : "MetaMask, Valora and other phone wallets") : "Scan a QR code with a phone wallet") : "In this browser"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {view.step === "waiting" ? (
          <p className="gbw-note" role="status">
            Confirm in {view.name}. If nothing opens, check your wallet's window.
          </p>
        ) : null}

        {view.step === "walletconnect" && !view.uri ? (
          <p className="gbw-note" role="status">
            Getting a connection link ready...
          </p>
        ) : null}

        {view.step === "walletconnect" && view.uri && !phone ? (
          <div>
            <div className="gbw-qr" data-goodbuild-qr="" aria-label="WalletConnect QR code">
              {Qr ? <Qr value={view.uri} /> : <span className="gbw-hint">Loading the QR code...</span>}
            </div>
            <button type="button" className="gbw-copy" onClick={() => void copy(view.uri!)}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            <p className="gbw-note">Open a WalletConnect wallet on your phone (MetaMask, Valora, OKX Wallet and others) and scan this code. Keep this page open until it connects.</p>
          </div>
        ) : null}

        {view.step === "walletconnect" && view.uri && phone ? (
          <div>
            <ul className="gbw-list">
              {PHONE_WALLETS.filter((w) => !w.iosOnly || isIos()).map((w) => (
                <li key={w.name}>
                  <a className="gbw-row" href={w.link + encodeURIComponent(view.uri!)} rel="noreferrer">
                    <Icon info={w} />
                    <span>
                      {w.name}
                      {w.hint ? <span className="gbw-hint">{w.hint}</span> : null}
                    </span>
                  </a>
                </li>
              ))}
              <li>
                <a className="gbw-row" href={view.uri} rel="noreferrer">
                  <Icon info={{ name: "Other wallet" }} />
                  <span>
                    Other wallet
                    <span className="gbw-hint">Any app that supports WalletConnect</span>
                  </span>
                </a>
              </li>
            </ul>
            <button type="button" className="gbw-copy" onClick={() => void copy(view.uri!)}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            <p className="gbw-note">Approve in your wallet, then come back to this page.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Show the list and resolve with the connected account. Rejects with code 4001 if the visitor closes it. */
export function openWalletChooser(args: { options: WalletInfo[]; connect: Connect; cancel: () => Promise<void> }): Promise<Address> {
  return new Promise((resolve, reject) => {
    addStyle();
    const host = document.createElement("div");
    host.setAttribute("data-goodbuild-wallets-root", "");
    document.body.appendChild(host);
    const root = createRoot(host);
    const before = document.activeElement as HTMLElement | null;
    let settled = false;
    const finish = (account: Address | null) => {
      if (settled) return;
      settled = true;
      setTimeout(() => {
        root.unmount();
        host.remove();
        before?.focus?.();
      });
      if (account) resolve(account);
      else {
        void args.cancel().catch(() => {});
        reject(Object.assign(new Error("You closed the wallet list."), { code: 4001 }));
      }
    };
    root.render(<WalletChooser options={args.options} connect={args.connect} onDone={(a) => finish(a)} onCancel={() => finish(null)} onBack={() => void args.cancel().catch(() => {})} />);
  });
}
