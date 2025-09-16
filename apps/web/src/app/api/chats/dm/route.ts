// apps/web/src/app/api/chats/dm/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { handleDmPost, type DmBody, type SupabaseLike } from '@/lib/dm/handler';
import { buildHasNickname } from '@/lib/profile/read';

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

    // Cast the heavy Supabase client to our light interface to avoid deep TS instantiation
    const supabase = getSupabaseAdmin() as unknown as SupabaseLike;

    const requireNickname =
      String(process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED).toLowerCase() === 'true';

    // Build args in two phases to avoid extra-property checks and keep types tight
    const baseArgs: Parameters<typeof handleDmPost>[0] = {
      ownerHeader: owner,
      body,
      supabase,
    };

    let result;
    if (requireNickname) {
      const hasNickname = await buildHasNickname(); // null if we can’t build a checker
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
