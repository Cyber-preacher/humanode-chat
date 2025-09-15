import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

type Params = { address: string };
type Ctx = { params: Promise<Params> };

export async function GET(_req: Request, ctx: Ctx) {
  const { address } = await ctx.params;
  const addr = (address ?? '').trim();

  if (!isAddress(addr)) {
    return NextResponse.json({ ok: false, error: 'Invalid Ethereum address' }, { status: 400 });
  }

  let biomapped = false;
  try {
    const mod: unknown = await import('@/lib/biomap');
    const fn = (mod as { isBiomapped?: (a: string) => Promise<boolean> }).isBiomapped;
    if (typeof fn === 'function') biomapped = await fn(addr);
  } catch {
    // keep API stable if lib is absent
  }

  return NextResponse.json({ ok: true, biomapped }, { status: 200 });
}
