import type { Abi } from 'viem';
import { env } from '@/env';
import addresses from '@/addresses.json' assert { type: 'json' };

/** Minimal ABI for the single function we call. */
const ProfileRegistryAbi = [
  {
    type: 'function',
    name: 'setNickname',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'nickname', type: 'string' }],
    outputs: [],
  },
] as const satisfies Abi;

/** Resolve ProfileRegistry address (env override, then addresses.json) */
export function resolveProfileRegistryAddress(): `0x${string}` {
  const chainId = Number(env.NEXT_PUBLIC_CHAIN_ID);
  if (!Number.isFinite(chainId)) {
    throw new Error('env.NEXT_PUBLIC_CHAIN_ID is not a valid number');
  }

  const fromEnv = env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined;
  if (fromEnv) return fromEnv;

  if (Number(addresses.chainId) === chainId && addresses.ProfileRegistry) {
    return addresses.ProfileRegistry as `0x${string}`;
  }

  throw new Error(
    `ProfileRegistry address not found for chain ${chainId}. ` +
      'Update apps/web/src/addresses.json or set NEXT_PUBLIC_PROFILE_REGISTRY.'
  );
}

/** Build a wagmi/viem writeContract config for setNickname. */
export function makeSetNicknameConfig(nickname: string, forcedAddress?: `0x${string}`) {
  const address = (forcedAddress ?? resolveProfileRegistryAddress()) as `0x${string}`;
  return {
    abi: ProfileRegistryAbi as unknown as Abi,
    address,
    functionName: 'setNickname',
    args: [nickname],
  } as const;
}

/** Back-compat export so existing imports still work. */
export const getSetNicknameConfig = makeSetNicknameConfig;
