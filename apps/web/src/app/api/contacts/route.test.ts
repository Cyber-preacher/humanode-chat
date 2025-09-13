/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { GET, POST } from './route';
const supaMock = require('../../../__mocks__/supabaseServer.mock');

// Construct NextRequest with absolute URL
function makeReq(url: string, init?: RequestInit): NextRequest {
  const abs = url.startsWith('http') ? url : `http://localhost${url}`;
  // @ts-expect-error for test env
  return new NextRequest(new Request(abs, init));
}

// Map alias used by route to our mock
jest.mock('@/lib/supabase/server', () => {
  const m = require('../../../__mocks__/supabaseServer.mock');
  return { __esModule: true, getSupabaseAdmin: m.getSupabaseAdmin };
});

describe('Contacts API', () => {
  beforeEach(() => {
    supaMock.__reset();
    supaMock.__setContacts([
      {
        owner_address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        contact_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        alias: 'Bob',
      },
    ]);
  });

  it('GET returns list for owner', async () => {
    const req = makeReq('/api/contacts?ownerAddress=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const res = await GET(req as unknown as Request);
    expect(res.status).toBe(200);
    const json = (await (res as any).json()) as any;
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.contacts)).toBe(true);
    expect(json.contacts.length).toBe(1);
  });

  it('POST adds a new contact, duplicate -> 409', async () => {
    const owner = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const contact = '0xcccccccccccccccccccccccccccccccccccccccc';

    // first add
    const res1 = await POST(
      makeReq('/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ownerAddress: owner, contactAddress: contact, alias: 'Carol' }),
      }) as unknown as Request,
    );
    expect(res1.status).toBe(201);

    // duplicate add
    const res2 = await POST(
      makeReq('/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ownerAddress: owner, contactAddress: contact }),
      }) as unknown as Request,
    );
    expect(res2.status).toBe(409);
  });
});
