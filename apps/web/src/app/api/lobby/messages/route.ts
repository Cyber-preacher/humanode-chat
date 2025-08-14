import { NextRequest, NextResponse } from 'next/server';
import { z as _zod } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server'; // alias so Jest mock hooks
import { checkLobbyRateLimit, rateLimitHeaders } from '@/lib/ratelimit';

// GET /api/lobby/messages?limit=NUMBER
const GetQuery = _zod.object({
  limit: _zod.coerce.number().int().min(1).max(100).default(20),
});

// POST /api/lobby/messages
const PostBody = _zod.object({
  senderAddress: _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  body: _zod.string().min(1, 'body required').max(2000),
});

export async function GET(req: NextRequest) {
  // Make a URL safely for Jest (string) and Next runtime
  const raw = (req as unknown as { url?: string })?.url ?? '/api/lobby/messages';
  const url = raw.startsWith('http') ? new URL(raw) : new URL(`http://localhost${raw}`);

  const parsed = GetQuery.safeParse({ limit: url.searchParams.get('limit') });
  const limit = parsed.success ? parsed.data.limit : 20;

  const supabase = getSupabaseAdmin();
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
    const json = await req.json();
    const parsed = PostBody.safeParse(json);

    if (!parsed.success) {
      const msg =
        parsed.error.issues.find((i) => String(i.message).includes('Invalid Ethereum address'))
          ?.message ?? 'Invalid body';
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const senderLower = parsed.data.senderAddress.toLowerCase();

    // DB-backed rate limit (matches tests)
    const info = await checkLobbyRateLimit(supabase, senderLower, 30_000, 5);
    if (!info.allowed) {
      return new NextResponse(
        JSON.stringify({ ok: false, error: 'Rate limit exceeded. Please slow down.' }),
        { status: 429, headers: { 'content-type': 'application/json', ...rateLimitHeaders(info) } }
      );
    }

    // Insert; mock accepts snake case
    const { error: insertErr } = await supabase.from('messages').insert([
      {
        chat_id: 'c_lobby', // lobby id in mock
        sender_address: senderLower,
        body: parsed.data.body,
      },
    ]);

    if (insertErr) {
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
    }

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'content-type': 'application/json', ...rateLimitHeaders(info) },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
}
