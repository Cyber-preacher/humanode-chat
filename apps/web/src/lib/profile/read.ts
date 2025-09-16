// apps/web/src/lib/profile/read.ts
//
// Provides a typed builder that returns a `hasNickname(address)` function.
// For now it uses the env fallback NEXT_PUBLIC_PROFILE_REGISTRY and RPC URL.
// Router-first lookup via addresses.json can be added later without touching callers.

import { createPublicClient, http, isAddress } from 'viem';
import type { Abi } from 'viem';

export type NicknameChecker = (address: string) => Promise<boolean>;

const PROFILE_REGISTRY_ABI: Abi = [
  {
    type: 'function',
    name: 'getNickname',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'nickname', type: 'string' }],
  },
] as const;

/**
 * Returns a NicknameChecker bound to the configured Profile Registry,
 * or null if we cannot build one (missing envs, etc.).
 *
 * Env used (fallback until router-first is wired):
 * - NEXT_PUBLIC_PROFILE_REGISTRY: address of the ProfileRegistry contract
 * - NEXT_PUBLIC_RPC_URL: RPC endpoint to read from
 */
export async function buildHasNickname(): Promise<NicknameChecker | null> {
  const registryAddr = (process.env.NEXT_PUBLIC_PROFILE_REGISTRY ?? '').trim();
  const rpcUrl = (process.env.NEXT_PUBLIC_RPC_URL ?? '').trim();

  if (!isAddress(registryAddr) || rpcUrl.length === 0) {
    // Cannot build a safe checker; let caller decide whether to enforce.
    return null;
  }

  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  return async (address: string): Promise<boolean> => {
    if (!isAddress(address)) return false;
    try {
      const nickname = await client.readContract({
        address: registryAddr as `0x${string}`,
        abi: PROFILE_REGISTRY_ABI,
        functionName: 'getNickname',
        args: [address as `0x${string}`],
      });
      return typeof nickname === 'string' && nickname.trim().length > 0;
    } catch {
      // Be conservative — a read failure means we cannot confirm a nickname.
      return false;
    }
  };
}
