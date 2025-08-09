// apps/web/src/app/api/lobby/messages/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Ensure Node runtime + no static caching
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = {
  senderAddress: string;
  body: string;
};

// Small helper: find or create the lobby chat
async function getOrCreateLobbyId(supa: ReturnType<typeof getSupabaseAdmin>) {
  // Try to fetch
  let { data: lobby, error } = await supa
    .from("chats")
    .select("id")
    .eq("slug", "lobby")
    .single();

  // If not found, create
  if (error && (error as any).code === "PGRST116") {
    const ins = await supa
      .from("chats")
      .insert({ slug: "lobby", is_public: true })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    lobby = ins.data;
  } else if (error) {
    throw error;
  }

  if (!lobby) throw new Error("Lobby not available");
  return lobby.id as string;
}

// GET /api/lobby/messages?limit=50
export async function GET(req: Request) {
  try {
    const supa = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const lobbyId = await getOrCreateLobbyId(supa);

    const { data, error } = await supa
      .from("messages")
      .select("id, chat_id, sender_address, body, created_at")
      .eq("chat_id", lobbyId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ ok: true, messages: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST /api/lobby/messages  { senderAddress, body }
export async function POST(req: Request) {
  try {
    const supa = getSupabaseAdmin();
    const { senderAddress, body } = (await req.json()) as PostBody;

    // minimal validation
    if (typeof senderAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(senderAddress)) {
      return NextResponse.json({ ok: false, error: "Invalid senderAddress" }, { status: 400 });
    }
    if (typeof body !== "string" || body.trim().length === 0 || body.length > 2000) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const lobbyId = await getOrCreateLobbyId(supa);

    const payload = {
      chat_id: lobbyId,
      sender_address: senderAddress.toLowerCase(),
      body: body.trim(),
    };

    const { data, error } = await supa.from("messages").insert(payload).select().single();
    if (error) throw error;

    return NextResponse.json({ ok: true, message: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
