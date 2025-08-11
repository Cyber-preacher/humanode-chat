/**
 * Tests the /api/lobby/messages route using a fully awaitable Supabase mock.
 * We run in the 'node' test environment (see jest.config.js).
 */

import { NextRequest } from "next/server";
import { GET, POST } from "./route";

// Wire our mock module in place of '@/lib/supabase/server'
jest.mock("@/lib/supabase/server", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require("../../../../__mocks__/supabaseServer.mock");
  return { __esModule: true, ...m };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const supaMock = require("../../../../__mocks__/supabaseServer.mock");

/** Construct a NextRequest with an absolute URL (required by WHATWG URL). */
function makeReq(path: string, init?: RequestInit): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  // @ts-expect-error — constructing NextRequest for unit tests
  return new NextRequest(new Request(url, init));
}

describe("Lobby messages API", () => {
  beforeEach(() => {
    supaMock.__reset();
    supaMock.__setLobbyChat("lobby-1");
    supaMock.__setLobbyMessages([
      {
        id: "m1",
        sender_address: "0xaaa",
        body: "hello",
        created_at: "2024-01-01T00:00:00.000Z",
        chat_id: "lobby-1",
      },
      {
        id: "m2",
        sender_address: "0xbbb",
        body: "world",
        created_at: "2024-01-01T00:01:00.000Z",
        chat_id: "lobby-1",
      },
    ]);
  });

  it("GET returns messages (ok: true)", async () => {
    const req = makeReq("/api/lobby/messages?limit=2");
    const res = await GET(req as unknown as Request);

    expect(res.status).toBe(200);
    const json = (await (res as any).json()) as any;

    expect(json.ok).toBe(true);
    expect(Array.isArray(json.messages)).toBe(true);
    expect(json.messages).toHaveLength(2);
    expect(json.messages[0].id).toBe("m1");
    expect(json.messages[1].id).toBe("m2");
  });

  it("POST rejects invalid senderAddress", async () => {
    const bad = makeReq("/api/lobby/messages", {
      method: "POST",
      body: JSON.stringify({ senderAddress: "not-an-addr", body: "x" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(bad as unknown as Request);
    const json = (await (res as any).json()) as any;

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    // Adjust this match if your route uses a different exact message
    expect(String(json.error)).toContain("Invalid Ethereum address");
  });

  it("POST inserts a message (ok: true)", async () => {
    const good = makeReq("/api/lobby/messages", {
      method: "POST",
      body: JSON.stringify({
        senderAddress: "0x1111111111111111111111111111111111111111",
        body: "hey there",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(good as unknown as Request);
    expect(res.status).toBe(200);

    const json = (await (res as any).json()) as any;
    expect(json.ok).toBe(true);
    expect(json.message?.body).toBe("hey there");
  });
});
