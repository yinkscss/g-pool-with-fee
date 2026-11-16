/** Token amount (smallest unit) to a short human string, e.g. 1234.5 G$. */
export function formatAmount(value: bigint | undefined, decimals = 18, maxFraction = 2) {
  if (value === undefined) return "…";
  const zero = BigInt(0);
  const neg = value < zero;
  const abs = neg ? -value : value;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").slice(0, maxFraction).replace(/0+$/, "");
  return (neg ? "-" : "") + whole.toLocaleString("en-US") + (frac ? "." + frac : "");
}

/** Readable message from a wallet or contract error (user rejections, reverts, RPC errors). */
export function errorMessage(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string; code?: number } | undefined;
  if (err?.code === 4001 || /user (rejected|denied)/i.test(err?.message ?? "")) return "You cancelled the request in your wallet.";
  const text = err?.shortMessage ?? err?.message ?? "Something went wrong.";
  return text.split("\n")[0];
}
