// apps/web/src/app/api/chats/dm/route.ratelimit.test.ts

// 1) Mock the Supabase server client with the in-repo mock
jest.mock('@/lib/supabase/server', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/__mocks__/supabaseServer.mock');
  return mod;
});

// 2) Mock the DM handler so persistence always "succeeds"
jest.mock('@/lib/dm/handler', () => {
  let calls = 0;
  return {
    // Only the symbol(s) used by the route need to exist on this mock
    handleDmPost: jest.fn(async () => {
      calls += 1;
      const first = calls === 1;
      return {
        status: first ? 201 : 200,
        payload: {
          ok: true,
          id: 'dm:0xowner:0xpeer',
          chatId: 'chat-1',
          created: first,
        },
      };
    }),
  };
});

import { POST } from './route';
import { clearRateLimit } from '@/lib/ratelimit/memory';

function makeReq(owner: string, peer: string) {
  return new Request('http://local/api/chats/dm', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-owner-address': owner,
    },
    body: JSON.stringify({ peerAddress: peer }),
  });
}

describe('DM create rate limit', () => {
  const owner = '0x0000000000000000000000000000000000000001';
  const peer = '0x00000000000000000000000000000000000000A2';
  const prevGate = process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED;

  beforeAll(() => {
    // Avoid loading nickname checker in this test
    process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED = 'false';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED = prevGate;
  });

  beforeEach(() => {
    // Ensure each run starts clean
    clearRateLimit();
  });

  it('returns 429 after 5 create attempts within 30s per owner', async () => {
    // 1 → 201; then 2..5 → 200 (mocked handler); 6 → 429 (route limiter)
    const r1 = await POST(makeReq(owner, peer));
    expect([200, 201]).toContain(r1.status);

    const r2 = await POST(makeReq(owner, peer));
    expect([200, 201]).toContain(r2.status);

    const r3 = await POST(makeReq(owner, peer));
    expect([200, 201]).toContain(r3.status);

    const r4 = await POST(makeReq(owner, peer));
    expect([200, 201]).toContain(r4.status);

    const r5 = await POST(makeReq(owner, peer));
    expect([200, 201]).toContain(r5.status);

    const r6 = await POST(makeReq(owner, peer));
    expect(r6.status).toBe(429);
    const j6 = (await r6.json()) as { ok?: boolean; error?: string };
    expect(j6.ok).toBe(false);
  });
});
