/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
// apps/web/src/__tests__/contacts.patch.test.ts
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/contacts/route';
import { PATCH } from '@/app/api/contacts/[address]/route';

jest.mock('@/lib/supabase/server', () => {
  const m = require('../__mocks__/supabaseServer.mock');
  // reset between test files if supported
  try {
    m.getSupabaseAdmin().__reset();
  } catch {}
  return { getSupabaseAdmin: m.getSupabaseAdmin };
});

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init));
}

async function createContact(ownerAddress: string, contact: string, label?: string) {
  const res = await POST(
    new Request('http://test/api/contacts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ownerAddress, address: contact, label }),
    }) as unknown as NextRequest,
  );
  expect(res.status).toBe(201);
}

async function listContacts(ownerAddress: string) {
  const res = await GET(
    makeReq(`http://test/api/contacts?ownerAddress=${ownerAddress}`) as unknown as Request,
  );
  expect(res.status).toBe(200);
  const json = await (res as any).json();
  return json.contacts as Array<any>;
}

describe('Contacts API - PATCH /api/contacts/:id', () => {
  const owner = '0xOwner';

  it('updates label when x-owner-address matches', async () => {
    await createContact(owner, '0xA1', 'Old');
    const list1 = await listContacts(owner);
    expect(list1.length).toBe(1);
    const id = list1[0].id;

    const req = makeReq(`http://test/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-owner-address': owner },
      body: JSON.stringify({ label: 'NewLabel' }),
    });
    const res = await PATCH(req as unknown as NextRequest, { params: { id } } as any);
    expect(res.status).toBe(200);
    const json = await (res as any).json();
    expect(json.ok).toBe(true);
    expect(json.contact.label).toBe('NewLabel');

    const list2 = await listContacts(owner);
    expect(list2[0].label).toBe('NewLabel');
  });

  it('forbids update if x-owner-address mismatches', async () => {
    const list = await listContacts(owner);
    const id = list[0].id;

    const req = makeReq(`http://test/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-owner-address': '0xOtherOwner' },
      body: JSON.stringify({ label: 'Hacker' }),
    });
    const res = await PATCH(req as unknown as NextRequest, { params: { id } } as any);
    expect(res.status).toBe(403);
  });

  it('accepts null to clear label', async () => {
    const list = await listContacts(owner);
    const id = list[0].id;

    const req = makeReq(`http://test/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-owner-address': owner },
      body: JSON.stringify({ label: null }),
    });
    const res = await PATCH(req as unknown as NextRequest, { params: { id } } as any);
    expect(res.status).toBe(200);
    const json = await (res as any).json();
    expect(json.contact.label).toBeNull();
  });
});
