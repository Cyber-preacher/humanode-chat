import { NextRequest, NextResponse } from 'next/server';
import { z as _zod } from 'zod';
// NOTE: tests mock this exact path; do not change it.
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

/**
 * GET /api/lobby/messages?limit=NUMBER
 */
const GetQuery = _zod.object({
  limit: _zod.coerce.number().int().min(1).max(100).default(20),
});

/**
 * POST /api/lobby/messages body
 * Tests expect Ethereum address validation message and rate-limit behavior.
 */
const PostBody = _zod.object({
  senderAddress: _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  body: _zod.string().min(1, 'body required').max(2000),
});

/** --- Simple in-memory rate limiter (per senderAddress) --- */
type RLStore = Map<string, number[]>;

declare global {
  // eslint-disable-next-line no-var
  var __LOBBY_RL__: RLStore | undefined;
}

const RL_WINDOW_MS = 30_000;
const RL_MAX = 5;

// persist across HMR/test runs without using `any`
const rlStore: RLStore = globalThis.__LOBBY_RL__ ?? (globalThis.__LOBBY_RL__ = new Map());

function rateLimited(sender: string, now = Date.now()): boolean {
  const bucket = rlStore.get(sender) ?? [];
  const cutoff = now - RL_WINDOW_MS;
  const recent = bucket.filter((t) => t >= cutoff);
  if (recent.length >= RL_MAX) return true; // 6th call within 30s -> limited
  recent.push(now);
  rlStore.set(sender, recent);
  return false;
}

export async function GET(req: NextRequest) {
  try {
    // Support relative URLs in tests
    const url = new URL(req.url, 'http://localhost');
    const parsed = GetQuery.safeParse({ limit: url.searchParams.get('limit') });
    const limit = parsed.success ? parsed.data.limit : 20;

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false }) // tests expect this call
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: data ?? [] }, { status: 200 });
  } catch {
    // Malformed URL only (tests don't hit this on happy-path)
    return NextResponse.json({ ok: false, error: 'Invalid query parameters' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = PostBody.safeParse(json);

    if (!parsed.success) {
      // Match test expectation for invalid address error text
      const msg =
        parsed.error.issues.find((i) => String(i.message).includes('Invalid Ethereum address'))
          ?.message ?? 'Invalid body';
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const { senderAddress, body } = parsed.data;

    // Enforce 5 msgs / 30s per senderAddress (6th => 429)
    if (rateLimited(senderAddress)) {
      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded. Please slow down.' },
        { status: 429 }
      );
    }

    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.from('messages').insert([
      {
        // DB uses snake_case; mock ignores exact shape but keep consistent
        sender_address: senderAddress,
        body,
      },
    ]);

    if (error) {
      // If mock/DB signals failure (not RL), surface a generic 500
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
}
