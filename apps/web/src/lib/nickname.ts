// apps/web/src/lib/nickname.ts
import * as React from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { resolveProfileRegistryAddress } from '@/lib/biomap';
import { ProfileRegistryAbi } from '@/abi/ProfileRegistry';
import type { Abi } from 'viem';

function storageKey(chainId: number, address: string) {
  return `hmnd:nickname:${chainId}:${address.toLowerCase()}`;
}

export type UseNicknameResult = {
  nickname: string | null;
  localNick: string | null;
  isLoading: boolean;
  error: unknown;
};

/**
 * Reads a nickname for the given address from the on-chain ProfileRegistry.
 * Also exposes a cached value from localStorage as `localNick`.
 *
 * If no address is provided, it uses the connected account address.
 */
export function useNickname(addrOverride?: string): UseNicknameResult {
  const chainId = useChainId();
  const { address: connected } = useAccount();

  const address = (addrOverride ?? connected ?? '').toString();

  // useMemo actually uses both deps → keep them to satisfy eslint-plugin-react-hooks
  const key = React.useMemo(() => storageKey(chainId, address || ''), [chainId, address]);

  // Read from localStorage (client-only)
  const [localNick, setLocalNick] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && key) {
        setLocalNick(window.localStorage.getItem(key));
      }
    } catch {
      // ignore storage errors
    }
  }, [key]);

  const shouldRead = Boolean(address && address.startsWith('0x'));

  // resolveProfileRegistryAddress() takes NO args (router handles chain)
  const registryAddress = shouldRead
    ? (resolveProfileRegistryAddress() as `0x${string}`)
    : undefined;

  const { data, isPending, error } = useReadContract({
    abi: ProfileRegistryAbi as unknown as Abi,
    address: registryAddress,
    // NOTE: If your ABI uses a different read method (e.g., "nicknameOf"), swap the string below.
    functionName: 'getNickname' as unknown as never,
    args: shouldRead ? ([address as `0x${string}`] as const) : undefined,
  });

  const nickname = typeof data === 'string' && data.length > 0 ? (data as string) : null;

  // Persist latest on-chain value to localStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!key) return;
    if (nickname) {
      try {
        window.localStorage.setItem(key, nickname);
      } catch {
        // ignore storage errors
      }
    }
  }, [nickname, key]);

  return {
    nickname,
    localNick,
    isLoading: isPending,
    error,
  };
}
