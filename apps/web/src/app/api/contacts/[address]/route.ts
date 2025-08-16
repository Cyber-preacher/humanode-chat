import { NextResponse } from 'next/server';
import { z as _zod } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const Params = _zod.object({
  address: _zod.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

function getCookieOwner(req: Request): string | null {
  const raw = req.headers.get('cookie') || '';
  const parts = raw.split(/;\s*/);
  for (const p of parts) {
    const [k, ...rest] = p.split('=');
    if (k === 'hm_owner') return decodeURIComponent(rest.join('=') || '').toLowerCase();
  }
  return null;
}
function requireGate(): boolean {
  return String(process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED).toLowerCase() === 'true';
}

export async function DELETE(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const parsed = Params.safeParse({ address });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid address' }, { status: 400 });
  }

  const ownerFromCookie = getCookieOwner(req);
  const owner =
    ownerFromCookie ??
    (!requireGate()
      ? (new URL(req.url).searchParams.get('ownerAddress') || '').toLowerCase()
      : null);

  if (!owner) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('owner_address', owner)
    .eq('contact_address', parsed.data.address.toLowerCase());

  if (error) {
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
