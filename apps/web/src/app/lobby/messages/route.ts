// apps/web/src/app/api/lobby/messages/route.ts
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ok, badRequest, serverError, tooMany } from '@/lib/http';

// ===== Validation =====
const GetQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const PostBody = z.object({
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  body: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 chars)'),
});

// ===== Rate limit config (per address, per chat) =====
const RATE_LIMIT_WINDOW_SEC = 30;
const RATE_LIMIT_MAX = 5;

// GET /api/lobby/messages?limit=50
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = GetQuery.safeParse({
      limit: searchParams.get('limit'),
    });
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { limit } = parsed.data;

    const supa = getSupabaseAdmin();

    // Find lobby chat id
    const { data: lobby, error: e1 } = await supa
      .from('chats')
      .select('id')
      .eq('slug', 'lobby')
      .single();
    if (e1 || !lobby) throw e1 || new Error('Lobby not found');

    // Last N messages, newest last
    const { data, error } = await supa
      .from('messages')
      .select('id, chat_id, sender_address, body, created_at')
      .eq('chat_id', lobby.id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return ok({ messages: data ?? [] });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// POST /api/lobby/messages  { senderAddress, body }
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = PostBody.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const sender_address = parsed.data.senderAddress.toLowerCase();
    const body = parsed.data.body.trim();

    const supa = getSupabaseAdmin();

    // Find lobby chat id
    const { data: lobby, error: e1 } = await supa
      .from('chats')
      .select('id')
      .eq('slug', 'lobby')
      .single();
    if (e1 || !lobby) throw e1 || new Error('Lobby not found');

    // --- Rate limit: max RATE_LIMIT_MAX messages / RATE_LIMIT_WINDOW_SEC per sender per chat ---
    const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_SEC * 1000).toISOString();
    const { count: recentCount, error: countErr } = await supa
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', lobby.id)
      .eq('sender_address', sender_address)
      .gt('created_at', sinceIso);

    if (countErr) throw countErr;

    if (typeof recentCount === 'number' && recentCount >= RATE_LIMIT_MAX) {
      return tooMany(
        `Rate limit exceeded. Please wait a bit (≤ ${RATE_LIMIT_MAX} msgs / ${RATE_LIMIT_WINDOW_SEC}s).`
      );
    }

    // Insert message
    const payload = {
      chat_id: lobby.id,
      sender_address,
      body,
    };

    const { data, error } = await supa.from('messages').insert(payload).select().single();
    if (error) throw error;

    return ok({ message: data });
  } catch (err: unknown) {
    return serverError(err);
  }
}
