/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import * as supabaseMock from '@/__mocks__/supabaseServer.mock';

// Map alias used by route to our mock (ESM-friendly)
jest.mock('@/lib/supabase/server', () => supabaseMock);

import { GET, POST, DELETE } from '@/app/api/contacts/route';

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init));
}

type ListResp = { ok?: boolean; contacts: Array<{ id: string }> };

describe('Contacts API DELETE', () => {
  it('creates, lists, then deletes a contact', async () => {
    // Create
    const postRes = await POST(
      makeReq('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: '0xOwner',
          address: '0xOther',
          nickname: 'Alice',
        }),
      })
    );
    expect(postRes.status).toBe(201);

    // List
    const listRes = await GET(
      makeReq('http://localhost/api/contacts?ownerAddress=0xOwner') as unknown as Request
    );
    const listJson = (await listRes.json()) as ListResp;
    expect(listRes.status).toBe(200);
    expect(listJson.ok).toBe(true);
    expect(Array.isArray(listJson.contacts)).toBe(true);
    const created = listJson.contacts[0];
    expect(created).toBeTruthy();
    const id = created.id;

    // Delete with proper owner header
    const delRes = await DELETE(
      makeReq(`http://localhost/api/contacts?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-owner-address': '0xOwner' },
      })
    );
    expect(delRes.status).toBe(204);

    // Delete again -> 404
    const delRes2 = await DELETE(
      makeReq(`http://localhost/api/contacts?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-owner-address': '0xOwner' },
      })
    );
    expect(delRes2.status).toBe(404);
  });

  it('returns 403 when owner does not match', async () => {
    await POST(
      makeReq('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: '0xO1',
          address: '0xO2',
          nickname: 'Bob',
        }),
      })
    );

    const listRes = await GET(
      makeReq('http://localhost/api/contacts?ownerAddress=0xO1') as unknown as Request
    );
    const listJson = (await listRes.json()) as ListResp;
    const id = listJson.contacts[0]?.id as string;

    const delRes = await DELETE(
      makeReq(`http://localhost/api/contacts?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-owner-address': '0xNotOwner' },
      })
    );
    expect(delRes.status).toBe(403);
  });

  it('400 when id missing, 403 when header missing', async () => {
    const noId = await DELETE(makeReq('http://localhost/api/contacts', { method: 'DELETE' }));
    expect(noId.status).toBe(400);

    const withIdNoHeader = await DELETE(
      makeReq('http://localhost/api/contacts?id=deadbeef', { method: 'DELETE' })
    );
    expect(withIdNoHeader.status).toBe(403);
  });
});
