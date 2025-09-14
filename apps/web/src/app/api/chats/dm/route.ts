import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { headers } from 'next/headers';

type DmBody = { peerAddress?: string };

function canonId(a: string, b: string) {
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  return `dm:${A < B ? A : B}:${A < B ? B : A}`;
}

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    // Compatible with different Next typings: may be immediate or Promise-like
    const maybe = headers() as unknown as Headers | Promise<Headers>;
    const h = maybe instanceof Promise ? await maybe : maybe;

    const owner = (h.get('x-owner-address') ?? '').trim();
    if (!isAddress(owner)) return bad(400, 'Missing or invalid x-owner-address');

    let body: DmBody = {};
    try {
      body = (await req.json()) as DmBody;
    } catch {}

    const peer = String(body?.peerAddress ?? '').trim();
    if (!isAddress(peer)) return bad(400, 'Invalid Ethereum address: peerAddress');
    if (owner.toLowerCase() === peer.toLowerCase()) return bad(400, 'Cannot create DM with self');

    const id = canonId(owner, peer);
    return NextResponse.json({ ok: true, id, created: false }, { status: 200 });
  } catch (err) {
    return bad(500, String(err));
  }
}
