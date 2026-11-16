import { useCallback, useEffect, useRef, useState } from "react";
import type { TransactionReceipt } from "viem";
import { errorMessage } from "./format";

/**
 * Run an async read (usually publicClient.readContract) with loading and error state.
 * Pass enabled=false to skip it (e.g. no wallet or no deployed address yet).
 *   const tips = useRead(() => publicClient.readContract({ address, abi, functionName: "totalTips" }), [address], !!address);
 */
export function useRead<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fnRef.current());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

/**
 * Track one wallet transaction: pending while the wallet signs and the chain confirms,
 * then success or a readable error.
 *   const tx = useTx();
 *   await tx.run(() => writeContract({ ... }));  // returns the receipt, or undefined on error
 */
export function useTx() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);

  const run = useCallback(async (send: () => Promise<TransactionReceipt>) => {
    setPending(true);
    setError(null);
    setReceipt(null);
    try {
      const r = await send();
      if (r.status !== "success") throw new Error("The transaction was reverted.");
      setReceipt(r);
      return r;
    } catch (e) {
      setError(errorMessage(e));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error, receipt, reset: () => (setError(null), setReceipt(null)) };
}
