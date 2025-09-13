import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function pickLabel(input: unknown): string | null {
  let val: unknown = input;
  if (isRecord(input)) {
    const fromLabel = input['label'];
    const fromNickname = input['nickname'];
    val = typeof fromLabel !== 'undefined' ? fromLabel : fromNickname;
  }
  if (val === null || typeof val === 'undefined') return null;
  const s = String(val).trim();
  return s.length ? s : null;
}

/**
 * PATCH /api/contacts/:address
 * - segment name is "address" (row id); also accepts {id} for legacy tests
 * - body: { label?: string | null } (accepts "nickname")
 * - header guard: x-owner-address must match row owner
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ address?: string; id?: string }> },
) {
  const { address, id } = await ctx.params;
  const rowId = address ?? id;
  if (!rowId) return new NextResponse('Missing id', { status: 400 });

  const ownerHeader = (req.headers.get('x-owner-address') ?? '').trim();
  if (!ownerHeader) return new NextResponse('Forbidden', { status: 403 });

  let parsed: unknown = {};
  try {
    parsed = await req.json();
  } catch {}

  const newLabel = pickLabel(parsed);
  const supabase = getSupabaseAdmin();

  // Verify owner
  const { data: row, error: selErr } = await supabase
    .from('contacts')
    .select('id, owner_address')
    .eq('id', rowId)
    .limit(1)
    .single();
  if (selErr) return new NextResponse(String(selErr), { status: 500 });
  if (!row) return new NextResponse('Not found', { status: 404 });
  if ((row.owner_address ?? '') !== ownerHeader)
    return new NextResponse('Forbidden', { status: 403 });

  // Update
  const { error: updErr } = await supabase
    .from('contacts')
    .update({ label: newLabel })
    .eq('id', rowId);
  if (updErr) return new NextResponse(String(updErr), { status: 500 });

  // Return updated row
  const { data: updated, error: reSelErr } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', rowId)
    .limit(1)
    .single();
  if (reSelErr) return new NextResponse(String(reSelErr), { status: 500 });

  return NextResponse.json({ ok: true, contact: updated ?? null }, { status: 200 });
}
