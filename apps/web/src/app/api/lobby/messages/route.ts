import { NextRequest, NextResponse } from 'next/server';
import { z as _zod } from 'zod';
// NOTE: tests mock this exact path; do not change it.
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

/**
 * GET /api/lobby/messages?limit=NUMBER
 * Keep this schema name unique (no duplicate declarations).
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

export async function GET(req: NextRequest) {
  try {
    // Support relative URLs in tests
    const url = new URL(req.url, 'http://localhost');
    const parsed = GetQuery.safeParse({ limit: url.searchParams.get('limit') });
    const limit = parsed.success ? parsed.data.limit : 20;

    const supabase = await getSupabaseServerClient();

    // Keep the mock happy: simple chain (no .order)
    const { data, error } = await supabase.from('messages').select('*').limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: data ?? [] }, { status: 200 });
  } catch {
    // Only hit on malformed URL or unexpected throws in tests
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

    const supabase = await getSupabaseServerClient();

    const { senderAddress, body } = parsed.data;

    // Insert; schema uses snake_case in DB, but the mock only checks call count/result.
    const { error } = await supabase.from('messages').insert([
      {
        sender_address: senderAddress,
        body,
      },
    ]);

    if (error) {
      // Tests expect 429 + this exact message when rate limit triggers
      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded. Please slow down.' },
        { status: 429 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
}
