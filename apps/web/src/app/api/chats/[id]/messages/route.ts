import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

type ChatRow = { id: string; slug: string };
type MessageRow = {
  id: string;
  chat_id?: string;
  sender_address: string;
  body: string;
  created_at: string;
};

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 30_000;

async function findChatBySlug(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('chats')
    .select('id, slug')
    .eq('slug', slug)
    .limit(1)
    .single();
  if (error) throw new Error(String(error));
  return data as ChatRow | null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const slug = id ?? '';
  if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

  const chat = await findChatBySlug(slug);
  if (!chat) return NextResponse.json({ ok: false, error: 'Chat not found' }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chat.id)
    .order('created_at', { ascending: true });

  if (error)
    return NextResponse.json({ ok: false, error: String(error), messages: [] }, { status: 500 });

  return NextResponse.json({ ok: true, messages: (data as MessageRow[]) ?? [] }, { status: 200 });
}

function isValidAddress(addr: unknown): addr is string {
  return typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const slug = id ?? '';
  if (!slug) return new NextResponse('Invalid chat slug', { status: 400 });

  let parsed: unknown = null;
  try {
    parsed = await req.json();
  } catch {
    parsed = null;
  }
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  const senderAddress = typeof obj.senderAddress === 'string' ? obj.senderAddress : '';
  const text = typeof obj.body === 'string' ? obj.body : '';

  if (!isValidAddress(senderAddress)) {
    return NextResponse.json({ ok: false, error: 'Invalid Ethereum address' }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json({ ok: false, error: 'Empty body' }, { status: 400 });
  }

  const chat = await findChatBySlug(slug);
  if (!chat) return NextResponse.json({ ok: false, error: 'Chat not found' }, { status: 404 });

  // DB-backed rate limit: 5 per 30s per (sender, chat)
  const supabase = getSupabaseAdmin();
  const sinceIso = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const headRes = await supabase
    .from('messages')
    .select('id', { head: true, count: 'exact' })
    .eq('chat_id', chat.id)
    .eq('sender_address', senderAddress)
    .gte('created_at', sinceIso);

  const recentCount = (headRes as { count?: number }).count ?? 0;
  if (recentCount >= RATE_LIMIT) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([{ chat_id: chat.id, sender_address: senderAddress, body: text }])
    .single();

  if (error) return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });

  return NextResponse.json({ ok: true, message: data as MessageRow }, { status: 201 });
}
