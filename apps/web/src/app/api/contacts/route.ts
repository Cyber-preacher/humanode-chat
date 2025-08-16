import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const hexAddr = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

const GetQuery = z.object({
  ownerAddress: hexAddr,
});

const PostBody = z.object({
  ownerAddress: hexAddr,
  contactAddress: hexAddr,
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = GetQuery.safeParse({
    ownerAddress: url.searchParams.get('ownerAddress') ?? '',
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid ownerAddress' }, { status: 400 });
  }

  const owner = parsed.data.ownerAddress.toLowerCase();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_address', owner)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: String(error.message ?? error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, contacts: data }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const bodyUnknown = (await req.json().catch(() => null)) as unknown;
  const parsed = PostBody.safeParse(bodyUnknown);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }

  const owner = parsed.data.ownerAddress.toLowerCase();
  const contact = parsed.data.contactAddress.toLowerCase();

  if (owner === contact) {
    return NextResponse.json({ ok: false, error: 'Cannot add yourself' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Duplicate check (head + count)
  const { count: dupCount, error: countErr } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_address', owner)
    .eq('contact_address', contact);

  if (countErr) {
    return NextResponse.json(
      { ok: false, error: String(countErr.message ?? countErr) },
      { status: 500 }
    );
  }

  if ((dupCount ?? 0) > 0) {
    return NextResponse.json({ ok: false, error: 'Contact already exists' }, { status: 409 });
  }

  const { error: insertErr } = await supabase
    .from('contacts')
    .insert([{ owner_address: owner, contact_address: contact }]);

  if (insertErr) {
    return NextResponse.json(
      { ok: false, error: String(insertErr.message ?? insertErr) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
