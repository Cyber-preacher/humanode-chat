// apps/web/src/app/api/chats/dm/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { handleDmPost, type DmBody, type SupabaseLike } from '@/lib/dm/handler';
import { touchRateLimit } from '@/lib/ratelimit/memory';

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
      // empty is fine; handler validates
    }

    const owner = await readOwnerAddress(req);

    // --- Rate limit: 5 create attempts per 30s per owner ---
    const rl = touchRateLimit({
      bucket: 'dm:create',
      key: owner || 'anonymous',
      limit: 5,
      windowMs: 30_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too Many Requests' },
        { status: 429, headers: { 'x-ratelimit-remaining': String(rl.remaining) } },
      );
    }
    // -------------------------------------------------------

    // Cast Supabase to lightweight interface to avoid deep TS instantiation
    const supabase = getSupabaseAdmin() as unknown as SupabaseLike;

    const requireNickname =
      String(process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED).toLowerCase() === 'true';

    // Build base args
    const baseArgs: Parameters<typeof handleDmPost>[0] = {
      ownerHeader: owner,
      body,
      supabase,
    };

    let result;
    if (requireNickname) {
      // LAZY-load and tolerate failure in test/SSR environments
      let hasNickname: ((address: string) => Promise<boolean>) | null = null;
      try {
        const { buildHasNickname } = await import('@/lib/profile/read');
        hasNickname = await buildHasNickname();
      } catch {
        // ignore — if we can’t build a checker, we won’t enforce server-side
      }

      const args =
        hasNickname != null
          ? ({ ...baseArgs, requireNickname, hasNickname } as unknown as Parameters<
              typeof handleDmPost
            >[0])
          : baseArgs; // no checker → handler won't enforce
      result = await handleDmPost(args);
    } else {
      result = await handleDmPost(baseArgs);
    }

    return NextResponse.json(result.payload, { status: result.status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
