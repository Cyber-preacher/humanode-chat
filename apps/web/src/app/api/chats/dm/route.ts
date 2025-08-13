import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const Address = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
  .transform((s) => s.toLowerCase());

const Body = z.object({
  a: Address,
  b: Address,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { a, b } = parsed.data;
    if (a === b) {
      return NextResponse.json(
        { ok: false, error: 'Cannot create a DM with yourself' },
        { status: 400 }
      );
    }

    const [x, y] = [a, b].sort();
    const slug = `dm:${x}:${y}`;

    const supa = getSupabaseAdmin();

    const { data: existing } = await supa
      .from('chats')
      .select('id, slug, is_public')
      .eq('slug', slug)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ ok: true, chat: existing });
    }

    const { data: chat, error: cErr } = await supa
      .from('chats')
      .insert({ slug, is_public: false })
      .select('id, slug, is_public')
      .single();

    if (cErr || !chat?.id) throw cErr || new Error('Failed to create chat');

    const { error: pErr } = await supa.from('chat_participants').insert([
      { chat_id: chat.id, address: x },
      { chat_id: chat.id, address: y },
    ]);
    if (pErr) throw pErr;

    return NextResponse.json({ ok: true, chat });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
