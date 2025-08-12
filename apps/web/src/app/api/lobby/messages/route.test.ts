/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

// IMPORTANT: make Next’s web Request/Response available under Node
// (Next 15 exports these from next/server already; just importing NextRequest is enough in Jest node env)

import { GET, POST } from './route';

// Use the local mock directly (avoid alias issues on Windows)
const supaMock = require('../../../../__mocks__/supabaseServer.mock');

/** Construct a NextRequest with an absolute URL (JSDOM/URL require it). */
function makeReq(url: string, init?: RequestInit): NextRequest {
  const abs = url.startsWith('http') ? url : `http://localhost${url}`;
  // @ts-expect-error: constructing NextRequest for tests
  return new NextRequest(new Request(abs, init));
}

// Make sure the route under test uses our mock:
jest.mock('@/lib/supabase/server', () => {
  const m = require('../../../../__mocks__/supabaseServer.mock');
  return { __esModule: true, getSupabaseAdmin: m.getSupabaseAdmin };
});

describe('Lobby messages API', () => {
  beforeEach(() => {
    supaMock.__reset();

    const now = Date.now();
    // Seed 2 messages in the lobby so GET has something to return
    supaMock.__seedLobbyMessages([
      {
        id: 'm1',
        sender_address: '0x1111111111111111111111111111111111111111',
        body: 'hello',
        created_at: new Date(now - 5000).toISOString(),
      },
      {
        id: 'm2',
        sender_address: '0x2222222222222222222222222222222222222222',
        body: 'hi again',
        created_at: new Date(now - 4000).toISOString(),
      },
    ]);
  });

  it('GET returns messages (ok: true)', async () => {
    const req = makeReq('/api/lobby/messages?limit=10');
    const res = await GET(req as unknown as Request);

    expect(res.status).toBe(200);
    const json = (await (res as any).json()) as any;

    expect(json.ok).toBe(true);
    expect(Array.isArray(json.messages)).toBe(true);
    expect(json.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('POST rejects invalid senderAddress', async () => {
    const req = makeReq('/api/lobby/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ senderAddress: 'nope', body: 'x' }),
    });

    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(400);

    const json = (await (res as any).json()) as any;
    expect(json.ok).toBe(false);
    // Route error text is "Invalid Ethereum address"
    expect(String(json.error)).toContain('Invalid Ethereum address');
  });

  it('POST rate limits after 5 msgs per 30s window (429)', async () => {
    // Seed 5 recent messages from the same sender *within the window*
    const sender = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const now = Date.now();
    supaMock.__seedLobbyMessages([
      {
        id: 'a1',
        sender_address: sender,
        body: 'a',
        created_at: new Date(now - 1000).toISOString(),
      },
      {
        id: 'a2',
        sender_address: sender,
        body: 'b',
        created_at: new Date(now - 900).toISOString(),
      },
      {
        id: 'a3',
        sender_address: sender,
        body: 'c',
        created_at: new Date(now - 800).toISOString(),
      },
      {
        id: 'a4',
        sender_address: sender,
        body: 'd',
        created_at: new Date(now - 700).toISOString(),
      },
      {
        id: 'a5',
        sender_address: sender,
        body: 'e',
        created_at: new Date(now - 600).toISOString(),
      },
    ]);

    const req = makeReq('/api/lobby/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ senderAddress: sender, body: 'should be blocked' }),
    });

    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(429);

    const json = (await (res as any).json()) as any;
    expect(json.ok).toBe(false);
  });
});
