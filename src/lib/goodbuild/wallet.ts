/**
 * Written by GoodBuild: how this app finds and connects wallets. Don't edit it, and don't read
 * window.ethereum yourself: use connectWallet / writeContract (src/lib/chain.ts), useWallet
 * (src/lib/useWallet.ts) and ConnectButton.
 *
 * Browser wallets are found with EIP-6963, so several extensions can live side by side and the
 * visitor picks one. MiniPay connects on its own, with no list. Phone wallets (MetaMask, Valora and
 * others) connect with WalletConnect once the app is published: a QR code on a computer, a button per
 * wallet on a phone. The preview offers browser wallets only.
 */
import type { Address, EIP1193Provider } from "viem";
import { celo } from "viem/chains";
import { openWalletChooser } from "./walletChooser";

/** Written by GoodBuild for this project's target network. */
export const appChain = celo;

export interface WalletInfo {
  /** "minipay", "walletconnect", "injected", or the wallet's EIP-6963 rdns such as "io.metamask". */
  id: string;
  name: string;
  /** A data:image/ or https: URL, or null. */
  icon: string | null;
  kind: "injected" | "walletconnect";
}

export interface WalletState {
  account: Address | null;
  wallet: WalletInfo | null;
  connecting: boolean;
}

export class WalletError extends Error {
  code: string | number;
  constructor(code: string | number, message: string) {
    super(message);
    this.code = code;
  }
}

type Handler = (...args: never[]) => void;
type Provider = EIP1193Provider & {
  isMiniPay?: boolean;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  accounts?: string[];
  on?: (event: string, handler: Handler) => void;
  removeListener?: (event: string, handler: Handler) => void;
  disconnect?: () => Promise<void>;
};
type Announced = { info: WalletInfo; provider: Provider };

const STORAGE_KEY = "goodbuild-wallet";
const MINIPAY: WalletInfo = { id: "minipay", name: "MiniPay", icon: null, kind: "injected" };
const WALLETCONNECT: WalletInfo = { id: "walletconnect", name: "WalletConnect", icon: null, kind: "walletconnect" };
/** OKX Wallet: the extension injects window.okxwallet (OKX's docs). OKX also says that route is "compatible with OKX App's built-in DApp browser", so it is expected there too (UNVERIFIED). The id is its EIP-6963 rdns, so the choice is remembered the same way whether or not it announced itself. */
const OKX_ID = "com.okex.wallet";

let state: WalletState = { account: null, wallet: null, connecting: false };
let active: Provider | null = null;
let pending: Promise<Address> | null = null;
let restoring: Promise<void> | null = null;
let listening = false;
let walletConnectStarted = false;
const listeners = new Set<() => void>();
const announced = new Map<string, Announced>();

function emit() {
  for (const listener of [...listeners]) listener();
}

function setState(next: Partial<WalletState>) {
  state = { ...state, ...next };
  emit();
}

/** The current account, wallet and whether a connection is in progress. Stable between changes. */
export function walletState(): WalletState {
  return state;
}

/** Called on every change (for useSyncExternalStore). Returns the unsubscribe function. */
export function subscribeWallet(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The connected wallet's EIP-1193 provider, or null. For requests the helpers don't cover, such as wallet_watchAsset. */
export function walletProvider(): EIP1193Provider | null {
  return active;
}

/** Only data:image/ and https: icons, so a wallet's announcement can't point the page anywhere else. */
export function safeIcon(icon: unknown): string | null {
  if (typeof icon !== "string" || icon.length > 100000) return null;
  const lower = icon.slice(0, 16).toLowerCase();
  return lower.startsWith("data:image/") || lower.startsWith("https://") ? icon : null;
}

function legacy(): Provider | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = (window as unknown as { ethereum?: Provider }).ethereum;
  return eth && typeof eth.request === "function" ? eth : undefined;
}

/** OKX's own global. A value without a request method is not a wallet. */
function okxLegacy(): Provider | undefined {
  if (typeof window === "undefined") return undefined;
  const okx = (window as unknown as { okxwallet?: Provider }).okxwallet;
  return okx && typeof okx.request === "function" ? okx : undefined;
}

/** True inside the MiniPay wallet, which connects without asking. */
export function isMiniPay(): boolean {
  return legacy()?.isMiniPay === true;
}

function onAnnounce(event: Event) {
  const detail = (event as CustomEvent).detail as { info?: { uuid?: unknown; name?: unknown; icon?: unknown; rdns?: unknown }; provider?: Provider } | undefined;
  const provider = detail?.provider;
  const info = detail?.info;
  if (!provider || typeof provider.request !== "function" || !info) return;
  const id = String(info.rdns || info.uuid || "").slice(0, 100);
  if (!id || id === MINIPAY.id || id === WALLETCONNECT.id || id === "injected") return;
  const name = String(info.name || "Browser wallet").slice(0, 40);
  announced.set(id, { info: { id, name, icon: safeIcon(info.icon), kind: "injected" }, provider });
  emit();
}

/** Ask installed wallets to announce themselves (EIP-6963). Safe to call more than once. */
export function discoverWallets(): void {
  if (typeof window === "undefined") return;
  if (!listening) {
    listening = true;
    window.addEventListener("eip6963:announceProvider", onAnnounce);
  }
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

discoverWallets();

/**
 * Wallets in this browser: every EIP-6963 announcement, plus OKX's window.okxwallet and window.ethereum
 * if they didn't announce themselves. Each wallet is listed once: OKX is matched by id, by being the same
 * object, or by name (in case it announces under another id), and window.ethereum is skipped when it is OKX.
 */
export function browserWallets(): WalletInfo[] {
  const found = [...announced.values()];
  const list = found.map((w) => w.info);
  const okx = okxLegacy();
  if (okx && !found.some((w) => w.info.id === OKX_ID || w.provider === okx || /\bokx\b|okex/i.test(w.info.name))) {
    list.push({ id: OKX_ID, name: "OKX Wallet", icon: null, kind: "injected" });
  }
  const eth = legacy();
  const ethIsOkx = !!eth && (eth === okx || (list.some((w) => w.id === OKX_ID || /\bokx\b|okex/i.test(w.name)) && (eth.isOkxWallet === true || eth.isOKExWallet === true)));
  if (eth && !eth.isMiniPay && !ethIsOkx && !found.some((w) => w.provider === eth)) {
    list.push({ id: "injected", name: eth.isMetaMask ? "MetaMask" : "Browser wallet", icon: null, kind: "injected" });
  }
  return list;
}

function walletConnectProjectId(): string | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('meta[name="goodbuild-walletconnect"]')?.getAttribute("content") || null;
}

/** WalletConnect (phone wallets) is on in published apps. The preview has browser wallets only. */
export function walletConnectAvailable(): boolean {
  return !!walletConnectProjectId();
}

/** What the chooser lists, in order. */
export function walletOptions(): WalletInfo[] {
  if (isMiniPay()) return [MINIPAY];
  return walletConnectAvailable() ? [...browserWallets(), WALLETCONNECT] : browserWallets();
}

/** True when there's some way to connect: MiniPay, a browser wallet, or WalletConnect. */
export function hasWallet(): boolean {
  return walletOptions().length > 0;
}

function providerOf(info: WalletInfo): Provider | undefined {
  if (info.id === MINIPAY.id || info.id === "injected") return legacy();
  return announced.get(info.id)?.provider ?? (info.id === OKX_ID ? okxLegacy() : undefined);
}

function remember(info: WalletInfo | null) {
  try {
    if (info) localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: info.id, kind: info.kind }));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private windows may refuse. The visitor just picks again next time.
  }
}

function remembered(): { id: string; kind: string } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { id?: unknown; kind?: unknown } | null;
    return saved && typeof saved.id === "string" && typeof saved.kind === "string" ? { id: saved.id, kind: saved.kind } : null;
  } catch {
    return null;
  }
}

const onAccountsChanged = (accounts: string[]) => {
  const account = (accounts?.[0] as Address | undefined) ?? null;
  if (account) setState({ account });
  else void disconnectWallet();
};
const onDisconnect = () => void disconnectWallet();

function detach() {
  active?.removeListener?.("accountsChanged", onAccountsChanged as Handler);
  active?.removeListener?.("disconnect", onDisconnect as Handler);
}

function adopt(info: WalletInfo, provider: Provider, account: Address): Address {
  detach();
  active = provider;
  provider.on?.("accountsChanged", onAccountsChanged as Handler);
  if (info.kind === "walletconnect") provider.on?.("disconnect", onDisconnect as Handler);
  remember(info);
  setState({ account, wallet: info });
  return account;
}

/**
 * MetaMask's plain account request pre-selects every network it knows, including Tron, then
 * rejects the approval because it can't store a Tron scope. Naming the Celo chains keeps Tron
 * out. A wallet that doesn't understand that request still gets eth_requestAccounts.
 *
 * MetaMask also refuses the whole request when it names a network the wallet hasn't added (often
 * Celo Sepolia: "Received scopeString value(s): eip155:11142220 ... not supported by the wallet").
 * Then we ask again without that network, and ensureChain adds it after connecting.
 */
function isMetaMask(info: WalletInfo): boolean {
  return info.id === "io.metamask" || info.id === "io.metamask.flask";
}

function isScopeError(error: unknown): boolean {
  const message = (error as { message?: string })?.message ?? "";
  return message.includes("endowment:caip25") || message.includes("authorizedScopes");
}

/** The EVM chains (as hex) a scope error says the wallet hasn't added. */
function unsupportedEvmChains(error: unknown): string[] {
  if (!isScopeError(error)) return [];
  const message = (error as { message?: string })?.message ?? "";
  return Array.from(message.matchAll(/eip155:(\d+)/g)).map((m) => "0x" + Number(m[1]).toString(16));
}

function scopedPermissionUnsupported(error: unknown): boolean {
  const code = (error as { code?: number })?.code;
  const message = (error as { message?: string })?.message ?? "";
  if (code === 4001 || /reject|denied|cancel/i.test(message)) return false;
  if (isScopeError(error)) return false;
  return code === -32601 || code === -32602 || /method not found|does not exist|unrecognized|not supported|unsupported/i.test(message);
}

// Celo (42220) and Celo Sepolia (11142220). Written as hex so a project on one chain, whose import keeps only that chain, still names both.
const CELO_CHAINS = ["0xa4ec", "0xaa044c"];
// Every MetaMask has Ethereum, so it stands in when the wallet has neither Celo chain. It still keeps Tron out.
const FALLBACK_CHAINS = ["0x1"];

async function requestMetaMaskAccount(provider: Provider): Promise<Address | undefined> {
  const ask = (chains: string[]) => provider.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {}, "endowment:permitted-chains": { caveats: [{ type: "restrictNetworkSwitching", value: chains }] } }],
  });
  let chains = CELO_CHAINS;
  let revoked = false;
  for (;;) {
    try {
      await ask(chains);
      break;
    } catch (error) {
      if (scopedPermissionUnsupported(error)) {
        const [account] = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
        return account;
      }
      if (!isScopeError(error)) throw error;
      const missing = unsupportedEvmChains(error);
      if (missing.length) {
        // A network the wallet hasn't added. Ask without it; ensureChain adds it after connecting.
        const left = chains.filter((c) => !missing.includes(c));
        if (left.length === chains.length || chains === FALLBACK_CHAINS) throw error;
        chains = left.length ? left : FALLBACK_CHAINS;
        continue;
      }
      // A permission saved earlier can merge Tron back in. Drop it and ask once more.
      if (revoked) throw error;
      revoked = true;
      await provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(() => {});
    }
  }
  const [account] = (await provider.request({ method: "eth_accounts" })) as Address[];
  return account;
}

async function connectInjected(info: WalletInfo, provider: Provider): Promise<Address> {
  const account = isMetaMask(info) ? await requestMetaMaskAccount(provider) : ((await provider.request({ method: "eth_requestAccounts" })) as Address[])[0];
  if (!account) throw new WalletError("no_account", "Your wallet didn't share an account. Unlock it and try again.");
  adopt(info, provider, account);
  await ensureChain(provider);
  return account;
}

/** Connect one wallet from the list. onUri gets the WalletConnect link to show as a QR code or open in a phone wallet. */
export async function connectWith(info: WalletInfo, onUri: (uri: string) => void = () => {}): Promise<Address> {
  if (info.kind === "walletconnect") {
    const projectId = walletConnectProjectId();
    if (!projectId) throw new WalletError("no_walletconnect", "Phone wallets connect once this app is published.");
    walletConnectStarted = true;
    const wc = await import("./walletConnect");
    const provider = (await wc.connectWalletConnect({ projectId, chain: appChain, onUri })) as unknown as Provider;
    const account = provider.accounts?.[0] as Address | undefined;
    if (!account) throw new WalletError("no_account", "The wallet didn't share an account. Try again.");
    return adopt(WALLETCONNECT, provider, account);
  }
  const provider = providerOf(info);
  if (!provider) throw new WalletError("no_wallet", info.name + " isn't available any more. Reload the page and try again.");
  return connectInjected(info, provider);
}

/** Stop a WalletConnect attempt the visitor walked away from. */
export async function cancelWalletConnect(): Promise<void> {
  // Not started means nothing to stop, and WalletConnect's code stays undownloaded.
  if (!walletConnectStarted) return;
  const wc = await import("./walletConnect");
  wc.cancelWalletConnect();
}

/** Give the page a moment to hear from wallets that loaded after it. */
function waitForWallets(ms = 60): Promise<void> {
  discoverWallets();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chooseAndConnect(): Promise<Address> {
  if (isMiniPay()) return connectInjected(MINIPAY, legacy()!);
  if (!browserWallets().length) await waitForWallets();
  const options = walletOptions();
  if (!options.length) {
    throw new WalletError("no_wallet", "No wallet found. Install a wallet such as MetaMask or Valora, or open this app in MiniPay.");
  }
  // One browser wallet and nothing else to choose (the preview): connect it straight away.
  if (options.length === 1 && options[0].kind === "injected") return connectWith(options[0]);
  return openWalletChooser({ options, connect: connectWith, cancel: cancelWalletConnect });
}

/**
 * Connect a wallet and return its address. Shows the wallet list when there's a choice; inside
 * MiniPay it connects straight away. If a wallet is already connected, returns its address.
 * Throws a WalletError with code 4001 if the visitor closes the list.
 */
export function connectWallet(): Promise<Address> {
  if (state.account && active) return Promise.resolve(state.account);
  if (!pending) {
    setState({ connecting: true });
    pending = chooseAndConnect().finally(() => {
      pending = null;
      setState({ connecting: false });
    });
  }
  return pending;
}

/** Forget the wallet in this app. Browser wallets are asked to drop the permission where they support it. */
export async function disconnectWallet(): Promise<void> {
  const provider = active;
  const wallet = state.wallet;
  detach();
  active = null;
  remember(null);
  setState({ account: null, wallet: null });
  if (!provider) return;
  if (wallet?.kind === "walletconnect") await provider.disconnect?.().catch(() => {});
  else await provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] } as never).catch(() => {});
}

/** Reconnect the wallet used last time without asking, if it still allows it. In MiniPay, connect. */
export function restoreWallet(): Promise<void> {
  restoring ??= (async () => {
    if (state.account) return;
    if (isMiniPay()) {
      await connectWallet();
      return;
    }
    const saved = remembered();
    if (!saved) return;
    if (saved.kind === "walletconnect") {
      const projectId = walletConnectProjectId();
      if (!projectId) return;
      const wc = await import("./walletConnect");
      const provider = (await wc.restoreWalletConnect({ projectId, chain: appChain })) as unknown as Provider | null;
      const account = provider?.accounts?.[0] as Address | undefined;
      if (provider && account && !state.account) adopt(WALLETCONNECT, provider, account);
      return;
    }
    if (!announced.has(saved.id) && !(saved.id === OKX_ID && okxLegacy())) await waitForWallets(300);
    const info = browserWallets().find((w) => w.id === saved.id);
    const provider = info && providerOf(info);
    if (!info || !provider) return;
    const [account] = (await provider.request({ method: "eth_accounts" })) as Address[];
    if (account && !state.account) adopt(info, provider, account);
  })().catch(() => {});
  return restoring;
}

/** Switch the wallet to this app's chain, adding the chain first if the wallet doesn't know it. */
export async function ensureChain(provider: EIP1193Provider | null = active): Promise<void> {
  if (!provider) throw new WalletError("not_connected", "Connect a wallet first.");
  const hex = "0x" + appChain.id.toString(16);
  const current = await provider.request({ method: "eth_chainId" }).catch(() => null);
  if (typeof current === "string" && parseInt(current, 16) === appChain.id) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hex,
          chainName: appChain.name,
          nativeCurrency: appChain.nativeCurrency,
          rpcUrls: [appChain.rpcUrls.default.http[0]],
          blockExplorerUrls: appChain.blockExplorers ? [appChain.blockExplorers.default.url] : [],
        },
      ],
    });
    // Adding a chain doesn't switch to it (EIP-3085), and OKX's default chain list has no Celo, so look once more and switch.
    // If the wallet moved by itself the read matches and nothing more is asked. A rejection of this second switch is the visitor's answer, so it is thrown.
    const after = await provider.request({ method: "eth_chainId" }).catch(() => null);
    if (typeof after === "string" && parseInt(after, 16) !== appChain.id) {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    }
  }
}

/** Connect if needed, switch to this app's chain, and return the provider and account to send with. */
export async function requireWallet(): Promise<{ provider: EIP1193Provider; account: Address }> {
  const account = await connectWallet();
  await ensureChain();
  if (!active) throw new WalletError("not_connected", "Connect a wallet first.");
  return { provider: active, account };
}
