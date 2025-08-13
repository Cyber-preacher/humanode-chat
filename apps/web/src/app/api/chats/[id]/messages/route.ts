import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const GetQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const PostBody = z.object({
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message too long (max 2000 chars)'),
});

const RATE_LIMIT_WINDOW_SEC = 30;
const RATE_LIMIT_MAX = 5;

// GET /api/chats/[id]/messages?limit=50
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; // slug
    const { searchParams } = new URL(req.url);
    const parsed = GetQuery.safeParse({ limit: searchParams.get('limit') });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }
    const { limit } = parsed.data;

    const supa = getSupabaseAdmin();

    // Find chat by slug
    const { data: chat, error: chatErr } = await supa.from('chats').select('id').eq('slug', id).single();
    if (chatErr || !chat) throw chatErr || new Error('Chat not found');

    const { data, error } = await supa
      .from('messages')
      .select('id, chat_id, sender_address, body, created_at')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ ok: true, messages: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST /api/chats/[id]/messages  { senderAddress, body }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; // slug
    const json = await req.json();
    const parsed = PostBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const sender_address = parsed.data.senderAddress.toLowerCase();
    const body = parsed.data.body.trim();

    const supa = getSupabaseAdmin();

    // Find chat by slug
    const { data: chat, error: chatErr } = await supa.from('chats').select('id').eq('slug', id).single();
    if (chatErr || !chat) throw chatErr || new Error('Chat not found');

    // Rate limit per sender per chat
    const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_SEC * 1000).toISOString();
    const { count: recentCount, error: countErr } = await supa
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chat.id)
      .eq('sender_address', sender_address)
      .gt('created_at', sinceIso);

    if (countErr) throw countErr;

    if (typeof recentCount === 'number' && recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        {
          ok: false,
          error: `Rate limit exceeded. Please wait a bit (≤ ${RATE_LIMIT_MAX} msgs / ${RATE_LIMIT_WINDOW_SEC}s).`,
        },
        { status: 429 },
      );
    }

    // Insert message
    const payload = { chat_id: chat.id, sender_address, body };
    const { data, error } = await supa.from('messages').insert(payload).select().single();
    if (error) throw error;

    return NextResponse.json({ ok: true, message: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
