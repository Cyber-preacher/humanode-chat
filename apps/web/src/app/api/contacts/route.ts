
// apps/web/src/app/api/contacts/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// Mock schema (per __mocks__/supabaseServer.mock.ts):
// id, owner_address, contact_address, label?, created_at

type ContactRow = {
  id: string;
  owner_address: string;
  contact_address: string;
  label: string | null;
};

type ContactsResp =
  | { ok: true; contacts: ContactRow[] }
  | { ok: false; error: string; contacts: [] };

function parseUrlencoded(raw: string): Record<string, string> | null {
  const params = new URLSearchParams(raw);
  const keys = Array.from(params.keys());
  if (!keys.length) return null;
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = params.get(k) ?? '';
  return out;
}

// Robust body parsing for Request/NextRequest without `any`
async function readJson(req: Request | NextRequest): Promise<unknown> {
  // Prefer reading the raw stream; works for both Request & NextRequest
  const stream = (req as Request).body;
  if (stream) {
    const raw = await new Response(stream).text();
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return parseUrlencoded(raw) ?? {};
      }
    }
  }
  // Fallback: try .text() if available (Request has it; NextRequest may not)
  if (typeof (req as Request).text === 'function') {
    const raw = await (req as Request).text();
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return parseUrlencoded(raw) ?? {};
      }
    }
  }
  // Final attempt: try .json() if available
  if (typeof (req as Request).json === 'function') {
    try {
      return await (req as Request).json();
    } catch {
      /* ignore */
    }
  }
  return {};
}

// Normalize request body keys → mock schema keys
function normalizeBodyToMock(body: unknown): {
  owner_address: string;
  contact_address: string;
  label: string | null;
} {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const owner_address = String(
    b.owner_address ?? b.ownerAddress ?? b.owner ?? b.owner_id ?? b.ownerId ?? ''
  );
  const contact_address = String(
    b.contact_address ?? b.contactAddress ?? b.address ?? b.contact ?? ''
  );
  let label: string | null = null;
  if (b.label != null) label = String(b.label);
  else if (b.nickname != null) label = String(b.nickname);
  return { owner_address, contact_address, label };
}

// Read owner filter from query (support aliases)
function getOwnerFromQuery(url: URL): string | undefined {
  return (
    url.searchParams.get('owner_address') ??
    url.searchParams.get('ownerAddress') ??
    url.searchParams.get('owner') ??
    undefined
  )?.toString();
}

/**
 * GET /api/contacts?ownerAddress=0x...  (also supports ?owner= and ?owner_address=)
 * Response: { ok: true, contacts: ContactRow[] }
 */
export async function GET(req: Request): Promise<NextResponse<ContactsResp>> {
  const url = new URL(req.url);
  const ownerFilter = getOwnerFromQuery(url);

  const supabase = getSupabaseAdmin();
  const base = supabase.from('contacts').select('*');

  const { data, error } = ownerFilter ? await base.eq('owner_address', ownerFilter) : await base;

  if (error) {
    return NextResponse.json({ ok: false, error: String(error), contacts: [] }, { status: 500 });
  }
  return NextResponse.json({ ok: true, contacts: (data as ContactRow[]) ?? [] }, { status: 200 });
}

/**
 * POST /api/contacts
 * Body accepts any of:
 *  - { owner_address, contact_address, label? }
 *  - { ownerAddress, address, nickname? }
 *  - { owner, contact, label? }
 * Returns: 201 { ok: true } | 409 Duplicate | 400 Invalid
 */
export async function POST(req: Request | NextRequest): Promise<NextResponse> {
  const raw = await readJson(req);
  const { owner_address, contact_address, label } = normalizeBodyToMock(raw);

  if (!owner_address || !contact_address) {
    return new NextResponse('Invalid body', { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Duplicate check on mock’s column names
  const { data: existing, error: selErr } = await supabase
    .from('contacts')
    .select('id')
    .eq('owner_address', owner_address)
    .eq('contact_address', contact_address)
    .limit(1);
  if (selErr) return new NextResponse(String(selErr), { status: 500 });
  if (existing && existing.length) return new NextResponse('Duplicate', { status: 409 });

  // Insert using mock’s column names
  const { error: insErr } = await supabase
    .from('contacts')
    .insert([{ owner_address, contact_address, label }]);
  if (insErr) return new NextResponse(String(insErr), { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/**
 * DELETE /api/contacts?id=<contactId>
 * TEMP check: compares `x-owner-address` header with row.owner_address (case-insensitive)
 * Returns 204 / 404 / 403 accordingly
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return new NextResponse('Missing id', { status: 400 });

  const ownerHeader = (req.headers.get('x-owner-address') ?? '').trim();
  if (!ownerHeader) return new NextResponse('Forbidden', { status: 403 });

  const supabase = getSupabaseAdmin();

  const { data: rows, error: selErr } = await supabase
    .from('contacts')
    .select('id, owner_address')
    .eq('id', id)
    .limit(1);
  if (selErr) return new NextResponse(String(selErr), { status: 500 });
  if (!rows || rows.length === 0) return new NextResponse('Not found', { status: 404 });

  const row = rows[0] as Pick<ContactRow, 'id' | 'owner_address'>;
  if ((row.owner_address ?? '').toLowerCase() !== ownerHeader.toLowerCase()) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { error: delErr } = await supabase.from('contacts').delete().eq('id', id);
  if (delErr) return new NextResponse(String(delErr), { status: 500 });

  return new NextResponse(null, { status: 204 });