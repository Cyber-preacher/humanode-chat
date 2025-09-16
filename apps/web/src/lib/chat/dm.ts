// apps/web/src/lib/chat/dm.ts
import { getAddress, isAddress, keccak256, toBytes } from 'viem';

export function normalizeAddress(addr: string): string {
  if (!isAddress(addr)) throw new Error(`Invalid EVM address: ${addr}`);
  // to EIP-55 checksum
  return getAddress(addr);
}

export function canonicalDmId(a: string, b: string): string {
  const A = normalizeAddress(a);
  const B = normalizeAddress(b);
  const [low, high] = [A, B].sort((x, y) => x.localeCompare(y));
  return `dm:${low}:${high}`;
}

/**
 * Deterministic hash for storage keys, later can map to DB ids.
 * NOTE: This is a hex string (0x...), not a UUID. We'll decide mapping next iteration.
 */
export function dmRoomHash(a: string, b: string): `0x${string}` {
  const id = canonicalDmId(a, b);
  return keccak256(toBytes(id));
}
