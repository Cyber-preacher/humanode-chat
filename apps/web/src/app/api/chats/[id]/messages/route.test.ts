/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

// apps/web/src/app/api/chats/[id]/messages/route.test.ts
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// IMPORTANT: one extra segment ([id]) means 5 x `..` to get back to `src/`
jest.mock('@/lib/supabase/server', () => {
  // Provide named exports back to the route under test
  // ⬇️ FIXED: 5 levels up, not 6
  const m = require('../../../../../__mocks__/supabaseServer.mock');
  return { __esModule: true, ...m };
});

// If you also import the helper controls for the mock:
const supaMock = require('../../../../../__mocks__/supabaseServer.mock');

// Construct a NextRequest with absolute URL (JSDOM needs it)
function makeReq(url: string, init?: RequestInit): NextRequest {
  // @ts-expect-error constructing for tests
  return new NextRequest(new Request(new URL(url, 'http://localhost').toString(), init));
}

describe('Chats messages API', () => {
  beforeEach(() => {
    supaMock.__reset();
    // Seed a "lobby" chat and two messages
    supaMock.__setChats([{ id: 'c1', slug: 'lobby' }]);
    supaMock.__setMessages([
      {
        id: 'm1',
        chat_id: 'c1',
        sender_address: '0x1111111111111111111111111111111111111111',
        body: 'Hello from lobby #1',
        created_at: new Date(Date.now() - 30000).toISOString(),
      },
      {
        id: 'm2',
        chat_id: 'c1',
        sender_address: '0x2222222222222222222222222222222222222222',
        body: 'Hello from lobby #2',
        created_at: new Date(Date.now() - 20000).toISOString(),
      },
    ]);
  });

  it('GET returns messages for slug (ok: true)', async () => {
    const req = makeReq('/api/chats/lobby/messages?limit=2');
    const res = await GET(req as unknown as Request, { params: { id: 'lobby' } });

    expect(res.status).toBe(200);
    const json = (await (res as any).json()) as any;

    expect(json.ok).toBe(true);
    expect(Array.isArray(json.messages)).toBe(true);
    expect(json.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('POST rejects invalid senderAddress', async () => {
    const req = makeReq('/api/chats/lobby/messages', {
      method: 'POST',
      body: JSON.stringify({ senderAddress: 'nope', body: 'hi' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req as unknown as Request, { params: { id: 'lobby' } });
    expect(res.status).toBe(400);

    const json = (await (res as any).json()) as any;
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain('Invalid Ethereum address');
  });

  it('POST inserts a message and rate-limits after 5 (429)', async () => {
    const goodBody = {
      senderAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      body: 'hello from test',
    };

    // Insert 5 messages in-window should be OK
    for (let i = 0; i < 5; i++) {
      const reqOk = makeReq('/api/chats/lobby/messages', {
        method: 'POST',
        body: JSON.stringify(goodBody),
        headers: { 'content-type': 'application/json' },
      });
      const resOk = await POST(reqOk as unknown as Request, { params: { id: 'lobby' } });
      expect([200, 201]).toContain(resOk.status);
      const j = await (resOk as any).json();
      expect(j.ok).toBe(true);
    }

    // 6th should be rate-limited
    const req6 = makeReq('/api/chats/lobby/messages', {
      method: 'POST',
      body: JSON.stringify(goodBody),
      headers: { 'content-type': 'application/json' },
    });
    const res6 = await POST(req6 as unknown as Request, { params: { id: 'lobby' } });
    expect(res6.status).toBe(429);
    const json6 = await (res6 as any).json();
    expect(json6.ok).toBe(false);
    expect(String(json6.error)).toContain('Rate limit exceeded');
  });
});
