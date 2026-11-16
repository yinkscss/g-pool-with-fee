import { useCallback } from "react";
import type { Abi, Address } from "viem";
import { chain, publicClient } from "./chain";
import { useRead } from "./hooks";
import { gdTokenAbi } from "./tokens";
import { SavingsPoolAbi, SavingsPoolAddress } from "../contracts";

/** The deployed pool address on this project's chain, or undefined until the owner deploys. */
export const poolAddress = SavingsPoolAddress[chain.id] as Address | undefined;

const poolAbi = SavingsPoolAbi as unknown as Abi;
const gdAbi = gdTokenAbi as unknown as Abi;

/** One read call, typed loosely then cast by the caller. */
async function read(address: Address, abi: Abi, functionName: string, args?: readonly unknown[]) {
  return publicClient.readContract({ address, abi, functionName, args } as never) as Promise<unknown>;
}

export type PoolInfo = {
  total: bigint;
  members: bigint;
  feeBps: bigint;
  owner: Address;
};

/** Everything the page shows: pool totals, the G$ token, and the connected wallet's numbers. */
export function usePool(account?: Address) {
  const address = poolAddress;

  const core = useRead<PoolInfo>(
    async () => {
      const target = address as Address;
      const [total, members, feeBps, owner] = await Promise.all([
        read(target, poolAbi, "totalDeposits"),
        read(target, poolAbi, "memberCount"),
        read(target, poolAbi, "feeBps"),
        read(target, poolAbi, "owner"),
      ]);
      return { total: total as bigint, members: members as bigint, feeBps: feeBps as bigint, owner: owner as Address };
    },
    [address],
    !!address,
  );

  const gd = useRead<Address>(async () => (await read(address as Address, poolAbi, "gd")) as Address, [address], !!address);

  const decimals = useRead<number>(
    async () => (await read(gd.data as Address, gdAbi, "decimals")) as number,
    [gd.data],
    !!gd.data,
  );

  const mine = useRead<{ held: bigint; share: bigint }>(
    async () => {
      const target = address as Address;
      const who = account as Address;
      const [held, share] = await Promise.all([
        read(target, poolAbi, "balanceOf", [who]),
        read(target, poolAbi, "shareOf", [who]),
      ]);
      return { held: held as bigint, share: share as bigint };
    },
    [address, account],
    !!address && !!account,
  );

  const walletGd = useRead<bigint>(
    async () => (await read(gd.data as Address, gdAbi, "balanceOf", [account as Address])) as bigint,
    [gd.data, account],
    !!gd.data && !!account,
  );

  const { refresh: r1 } = core;
  const { refresh: r2 } = gd;
  const { refresh: r3 } = decimals;
  const { refresh: r4 } = mine;
  const { refresh: r5 } = walletGd;

  const refresh = useCallback(() => {
    void r1();
    void r2();
    void r3();
    void r4();
    void r5();
  }, [r1, r2, r3, r4, r5]);

  return {
    address,
    loading: core.loading,
    error: core.error,
    total: core.data?.total,
    members: core.data?.members,
    feeBps: core.data?.feeBps,
    owner: core.data?.owner,
    gd: gd.data,
    decimals: decimals.data ?? 18,
    held: mine.data?.held,
    share: mine.data?.share,
    walletGd: walletGd.data,
    refresh,
  };
}
