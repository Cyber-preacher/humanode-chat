// apps/web/src/app/api/chats/dm/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { handleDmPost, type DmBody } from '@/lib/dm/handler';

type HeadersModule = {
  headers: () => Headers | Promise<Headers>;
};

async function readOwnerAddress(req: Request): Promise<string> {
  // Prefer request header; works in Next runtime & Jest
  const fromReq = (req.headers.get('x-owner-address') ?? '').trim();
  if (fromReq) return fromReq;

  // Optional: Next runtime headers() fallback (won't run in Jest)
  try {
    const modUnknown = (await import('next/headers')) as unknown;
    const mod = modUnknown as Partial<HeadersModule>;
    if (typeof mod.headers === 'function') {
      const maybe = mod.headers();
      const h = maybe instanceof Promise ? await maybe : maybe;
      return (h.get('x-owner-address') ?? '').trim();
    }
  } catch {
    // ignore
  }
  return fromReq;
}

export async function POST(req: Request) {
  try {
    let body: DmBody | null = null;
    try {
      body = (await req.json()) as DmBody;
    } catch {
      // empty is fine; handler validates
    }

    const owner = await readOwnerAddress(req);
    const supabase = getSupabaseAdmin();
    const result = await handleDmPost({ ownerHeader: owner, body, supabase });

    return NextResponse.json(result.payload, { status: result.status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
