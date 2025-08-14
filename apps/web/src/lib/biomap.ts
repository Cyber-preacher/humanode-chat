export type GateResult = { ok: true; status: 200 } | { ok: false; status: number; error: string };

const REQUIRE = String(process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED).toLowerCase() === 'true';

const isEth = (a: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(a);

/**
 * Server-side biomapper gate.
 * - When REQUIRE=false (default), always allow.
 * - When REQUIRE=true, dynamically import the registry ABI without relying on a specific export.
 *   (Avoids build breaks if the ABI’s export shape changes.)
 * - TODO: replace the placeholder "allow" with a real on-chain check.
 */
export async function ensureBiomapped(address: string): Promise<GateResult> {
  if (!REQUIRE) return { ok: true, status: 200 };

  const addr = String(address || '').toLowerCase();
  if (!isEth(addr)) {
    return { ok: false, status: 400, error: 'Invalid Ethereum address' };
  }

  try {
    // Dynamic import so we don't bind to a specific named export
    const profileMod: unknown = await import('@/abi/ProfileRegistry');

    let abi: unknown;
    if (profileMod && typeof profileMod === 'object') {
      const m = profileMod as Record<string, unknown>;
      abi = m.ProfileRegistry ?? m.abi ?? m.default;
    }

    if (!abi) {
      return { ok: false, status: 501, error: 'Biomapper not configured' };
    }

    // TODO: integrate real on-chain check (e.g., viem readContract)
    return { ok: true, status: 200 };
  } catch {
    return { ok: false, status: 501, error: 'Biomapper not configured' };
  }
}
