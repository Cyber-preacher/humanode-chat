import { NextRequest, NextResponse } from 'next/server';
import { z as _zod } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ensureBiomapped } from '@/lib/biomap';

const Params = _zod.object({
  ownerAddress: _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  address: _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export async function DELETE(req: NextRequest, context: { params: { address: string } }) {
  const raw = (req as unknown as { url?: string })?.url ?? '/api/contacts/x';
  const url = raw.startsWith('http') ? new URL(raw) : new URL(`http://localhost${raw}`);

  const parsed = Params.safeParse({
    ownerAddress: url.searchParams.get('ownerAddress'),
    address: context.params.address,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid address' }, { status: 400 });
  }

  const owner = parsed.data.ownerAddress.toLowerCase();
  const contact = parsed.data.address.toLowerCase();

  const gate = await ensureBiomapped(owner);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const supabase = getSupabaseAdmin();

  // Order of delete()/eq() is supported by our mock; this keeps it explicit.
  // @ts-expect-error mock supports delete() chain
  const { error } = await supabase
    .from('contacts')
    .eq('owner_address', owner)
    .eq('contact_address', contact)
    .delete();

  if (error) return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
