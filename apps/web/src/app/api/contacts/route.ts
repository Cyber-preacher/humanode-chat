/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { z as _zod } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ensureBiomapped } from '@/lib/biomap';

const Address = _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

const GetQuery = _zod.object({
  ownerAddress: Address,
});

const PostBody = _zod.object({
  ownerAddress: Address,
  contactAddress: Address,
  alias: _zod.string().trim().max(64).optional(),
});

export async function GET(req: NextRequest) {
  const raw = (req as unknown as { url?: string })?.url ?? '/api/contacts';
  const url = raw.startsWith('http') ? new URL(raw) : new URL(`http://localhost${raw}`);

  const parsed = GetQuery.safeParse({ ownerAddress: url.searchParams.get('ownerAddress') });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid ownerAddress' }, { status: 400 });
  }

  const owner = parsed.data.ownerAddress.toLowerCase();

  const gate = await ensureBiomapped(owner);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_address', owner)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });

  return NextResponse.json(
    {
      ok: true,
      contacts:
        (data ?? []).map((r: any) => ({
          address: r.contact_address,
          alias: r.alias ?? null,
          created_at: r.created_at,
        })) ?? [],
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PostBody.safeParse(body);
    if (!parsed.success) {
      const msg =
        parsed.error.issues.find((i) => String(i.message).includes('Invalid Ethereum address'))
          ?.message ?? 'Invalid body';
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const owner = parsed.data.ownerAddress.toLowerCase();
    const contact = parsed.data.contactAddress.toLowerCase();
    const alias = parsed.data.alias?.trim() || null;

    if (owner === contact) {
      return NextResponse.json({ ok: false, error: 'Cannot add yourself' }, { status: 400 });
    }

    const gate = await ensureBiomapped(owner);
    if (!gate.ok)
      return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const supabase = getSupabaseAdmin();

    const { count, error: countErr } = await supabase
      .from('contacts')
      .select('contact_address', { count: 'exact', head: true })
      .eq('owner_address', owner)
      .eq('contact_address', contact);

    if (countErr) return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
    if ((count ?? 0) > 0)
      return NextResponse.json({ ok: false, error: 'Already added' }, { status: 409 });

    const { error: insertErr } = await supabase.from('contacts').insert([
      {
        owner_address: owner,
        contact_address: contact,
        alias,
      },
    ]);

    if (insertErr)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
}
