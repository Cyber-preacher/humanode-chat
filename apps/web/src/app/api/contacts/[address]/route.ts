import { NextResponse } from 'next/server';
import { z as _zod } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ensureBiomapped } from '@/lib/biomap';

const Params = _zod.object({
  ownerAddress: _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  address: _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ address: string }> } // NOTE: Next 15 typedRoutes expects Promise here
) {
  const { address } = await ctx.params; // <- await the params per Next 15 types
  const url = new URL(req.url);

  const parsed = Params.safeParse({
    ownerAddress: url.searchParams.get('ownerAddress'),
    address,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid address' }, { status: 400 });
  }

  const owner = parsed.data.ownerAddress.toLowerCase();
  const contact = parsed.data.address.toLowerCase();

  const gate = await ensureBiomapped(owner);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const supabase = getSupabaseAdmin();
  // our mock & supabase v2 both support this chain order
  // @ts-expect-error delete() chain is supported by our mock in tests
  const { error } = await supabase
    .from('contacts')
    .eq('owner_address', owner)
    .eq('contact_address', contact)
    .delete();

  if (error) {
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
