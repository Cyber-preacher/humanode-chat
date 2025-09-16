// apps/web/src/app/api/chats/dm/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { handleDmPost, type DmBody, type SupabaseLike } from '@/lib/dm/handler';
import { touchRateLimit } from '@/lib/ratelimit/index';

type HeadersModule = {
  headers: () => Headers | Promise<Headers>;
};

async function readOwnerAddress(req: Request): Promise<string> {
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
      // empty body is OK; handler validates
    }

    const owner = await readOwnerAddress(req);

    // Acquire Supabase admin (or mock in tests)
    const supabase = getSupabaseAdmin() as unknown as SupabaseLike;

    // --- Rate limit: 5 create attempts per 30s per owner (DB-first; fallback to memory) ---
    const rl = await touchRateLimit({
      bucket: 'dm:create',
      key: owner || 'anonymous',
      limit: 5,
      windowMs: 30_000,
      supabase: supabase as unknown, // optional; DB path used if RPC exists
    });
    if (!rl.allowed) {
      const h = new Headers();
      h.set('x-ratelimit-remaining', String(rl.remaining));
      if (typeof rl.retryAfterMs === 'number')
        h.set('retry-after', String(Math.ceil(rl.retryAfterMs / 1000)));
      return NextResponse.json(
        { ok: false, error: 'Too Many Requests' },
        { status: 429, headers: h },
      );
    }
    // -------------------------------------------------------------------------------

    const requireNickname =
      String(process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED).toLowerCase() === 'true';

    const baseArgs: Parameters<typeof handleDmPost>[0] = {
      ownerHeader: owner,
      body,
      supabase,
    };

    let result;
    if (requireNickname) {
      let hasNickname: ((address: string) => Promise<boolean>) | null = null;
      try {
        const { buildHasNickname } = await import('@/lib/profile/read');
        hasNickname = await buildHasNickname();
      } catch {
        // ignore → no enforcement server-side if checker cannot be built
      }
      const args =
        hasNickname != null
          ? ({ ...baseArgs, requireNickname, hasNickname } as unknown as Parameters<
              typeof handleDmPost
            >[0])
          : baseArgs;
      result = await handleDmPost(args);
    } else {
      result = await handleDmPost(baseArgs);
    }

    return NextResponse.json(result.payload, { status: result.status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
