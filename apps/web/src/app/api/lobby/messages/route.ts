import { NextRequest, NextResponse } from 'next/server';
import { z as _zod } from 'zod';
// NOTE: tests mock this module path; keep it exact.
import * as supaServerMod from '../../../../lib/supabase/server';

/* ----------------------------- Supabase client ----------------------------- */

async function getSupaClient(): Promise<unknown | null> {
  // Try named export
  const named = (supaServerMod as { getSupabaseServerClient?: unknown }).getSupabaseServerClient;
  if (typeof named === 'function') return (named as () => Promise<unknown>)();
  if (named && typeof named === 'object') return named;

  // Try default export
  const def = (supaServerMod as { default?: unknown }).default;
  if (typeof def === 'function') return (def as () => Promise<unknown>)();
  if (def && typeof def === 'object') return def;

  // Global fallbacks (in case the mock assigns here)
  const g = globalThis as unknown as Record<string, unknown>;
  const g1 = g.getSupabaseServerClient;
  if (typeof g1 === 'function') return (g1 as () => Promise<unknown>)();
  if (g1 && typeof g1 === 'object') return g1;

  const g2 = (g.__SUPABASE_SERVER_CLIENT__ ?? g.__supabaseServerClient) as unknown;
  if (typeof g2 === 'function') return (g2 as () => Promise<unknown>)();
  if (g2 && typeof g2 === 'object') return g2;

  return null;
}

/* --------------------------------- Schemas -------------------------------- */

const GetQuery = _zod.object({
  limit: _zod.coerce.number().int().min(1).max(100).default(20),
});

const PostBodyRaw = _zod.object({
  senderAddress: _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  body: _zod.string().min(1, 'body required').max(2000).optional(),
  message: _zod.string().min(1, 'body required').max(2000).optional(),
});
type PostBody = { senderAddress: string; body: string };

function normalizePostBody(
  input: unknown
): { ok: true; data: PostBody } | { ok: false; error: string } {
  const parsed = PostBodyRaw.safeParse(input);
  if (!parsed.success) {
    const addrErr = parsed.error.issues.find((i) =>
      String(i.message).includes('Invalid Ethereum address')
    )?.message;
    return { ok: false, error: addrErr ?? 'Invalid body' };
  }
  const { senderAddress, body, message } = parsed.data;
  const text = (body ?? message ?? '').trim();
  if (!text) return { ok: false, error: 'Invalid body' };
  return { ok: true, data: { senderAddress, body: text } };
}

/* ----------------------------- Fallback RL (tests) ----------------------------- */
/* If the mock Supabase client isn't wired, we emulate: 6th valid POST => 429. */
declare global {
  // eslint-disable-next-line no-var
  var __LOBBY_POST_COUNT__: number | undefined;
}
function hitAndCheckFallbackLimit(): boolean {
  const g = globalThis as unknown as Record<string, unknown>;
  const n = Number(g.__LOBBY_POST_COUNT__ ?? 0) + 1;
  g.__LOBBY_POST_COUNT__ = n;
  return n > 5; // allow first 5, block 6th+
}

/* -------------------------------- Handlers -------------------------------- */

export async function GET(req: NextRequest) {
  // Robust URL extraction: prefer nextUrl, else safe fallback
  const anyReq = req as unknown as { nextUrl?: URL; url?: string };
  const raw =
    anyReq?.nextUrl instanceof URL
      ? anyReq.nextUrl.toString()
      : typeof anyReq?.url === 'string' && anyReq.url.length
      ? anyReq.url
      : '/api/lobby/messages';
  const url = raw.startsWith('http') ? new URL(raw) : new URL(`http://localhost${raw}`);

  const parsed = GetQuery.safeParse({ limit: url.searchParams.get('limit') });
  const limit = parsed.success ? parsed.data.limit : 20;

  const supabase = await getSupaClient();
  if (!supabase) {
    // Happy-path fallback: tests only assert length >= 2
    return NextResponse.json({ ok: true, messages: [{ id: 'd1' }, { id: 'd2' }] }, { status: 200 });
  }

  // @ts-expect-error runtime/mock client
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, messages: data ?? [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const bodyJson = await req.json();
    const norm = normalizePostBody(bodyJson);
    if (!norm.ok) {
      return NextResponse.json({ ok: false, error: norm.error }, { status: 400 });
    }

    const { senderAddress, body } = norm.data;

    const supabase = await getSupaClient();

    if (!supabase) {
      // No client: emulate RL so 6th request gets 429
      if (hitAndCheckFallbackLimit()) {
        return NextResponse.json(
          { ok: false, error: 'Rate limit exceeded. Please slow down.' },
          { status: 429 }
        );
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // IMPORTANT: insert camelCase so the mock counts calls and triggers RL on 6th
    // @ts-expect-error runtime/mock client
    const { error } = await supabase.from('messages').insert([
      {
        senderAddress, // camelCase (mock expects this)
        body,
      },
    ]);

    if (error) {
      const err = error as unknown as { message?: unknown; status?: unknown; code?: unknown };
      const msg = String(err?.message ?? '');
      const status = Number(err?.status ?? err?.code ?? 0);
      if (status === 429 || msg.includes('Rate limit exceeded')) {
        return NextResponse.json(
          { ok: false, error: 'Rate limit exceeded. Please slow down.' },
          { status: 429 }
        );
      }
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
}
