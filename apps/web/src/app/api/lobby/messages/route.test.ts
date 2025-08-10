/**
 * apps/web/src/app/api/lobby/messages/route.test.ts
 *
 * Jest tests for the lobby messages API route.
 * We mock Supabase on the *server* side via our local __mocks__ helper.
 */

// Mock the server-side supabase helper that route.ts imports
jest.mock('@/lib/supabase/server', () => {
  // path from: src/app/api/lobby/messages → back to src is 4 levels
  return require('../../../../__mocks__/supabaseServer.mock');
});

import { GET, POST } from './route';

// Control the mock state directly
const supaMock = require('../../../../__mocks__/supabaseServer.mock');

// Use the standard WHATWG Request (provided via undici in jest.setup)
function makeReq(url: string, init?: RequestInit): Request {
  const full = new URL(url, 'http://localhost').toString();
  return new Request(full, init);
}

describe('Lobby messages API', () => {
  beforeEach(() => {
    supaMock.__reset();
    supaMock.__setLobbyMessages([
      {
        id: 'm1',
        chat_id: 'lobby-uuid',
        sender_address: '0xaaaa00000000000000000000000000000000aaaa',
        body: 'hello',
        created_at: new Date(Date.now() - 1000).toISOString(),
      },
      {
        id: 'm2',
        chat_id: 'lobby-uuid',
        sender_address: '0xbbbb00000000000000000000000000000000bbbb',
        body: 'world',
        created_at: new Date().toISOString(),
      },
    ]);
  });

  it('GET returns messages (ok: true)', async () => {
    const req = makeReq('/api/lobby/messages?limit=2');
    const res = await GET(req as unknown as Request);
    expect(res.status).toBe(200);

    const json = await (res as any).json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.messages)).toBe(true);
    expect(json.messages).toHaveLength(2);
    expect(json.messages[0].body).toBe('hello');
    expect(json.messages[1].body).toBe('world');
  });

  it('POST rejects invalid senderAddress', async () => {
    const invalid = { senderAddress: 'not-an-addr', body: 'bad' };
    const req = makeReq('/api/lobby/messages', {
      method: 'POST',
      body: JSON.stringify(invalid),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(400);

    const json = await (res as any).json();
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain('Invalid Ethereum address');
  });

  it('POST inserts a message (ok: true)', async () => {
    const good = {
      senderAddress: '0xCcCc00000000000000000000000000000000cCcC',
      body: 'new msg',
    };
    const req = makeReq('/api/lobby/messages', {
      method: 'POST',
      body: JSON.stringify(good),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(200);

    const json = await (res as any).json();
    expect(json.ok).toBe(true);
    expect(json.message.body).toBe('new msg');
    // sender_address should be lowercased by the route
    expect(json.message.sender_address).toBe(good.senderAddress.toLowerCase());
  });
});
