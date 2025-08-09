import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// GET /api/lobby/messages?limit=50
export async function GET(req: Request) {
  try {
    const supa = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    // Find lobby chat id
    const { data: lobby, error: e1 } = await supa
      .from("chats")
      .select("id")
      .eq("slug", "lobby")
      .single();
    if (e1 || !lobby) throw e1 || new Error("Lobby not found");

    // Last N messages, newest last
    const { data, error } = await supa
      .from("messages")
      .select("id, chat_id, sender_address, body, created_at")
      .eq("chat_id", lobby.id)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ ok: true, messages: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST /api/lobby/messages  { senderAddress, body }
export async function POST(req: Request) {
  try {
    const { senderAddress, body } = (await req.json()) as {
      senderAddress?: string;
      body?: string;
    };

    // minimal validation
    if (typeof senderAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(senderAddress)) {
      return NextResponse.json({ ok: false, error: "Invalid senderAddress" }, { status: 400 });
    }
    if (typeof body !== "string" || body.trim().length === 0 || body.length > 2000) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const supa = getSupabaseAdmin();

    const { data: lobby, error: e1 } = await supa
      .from("chats")
      .select("id")
      .eq("slug", "lobby")
      .single();
    if (e1 || !lobby) throw e1 || new Error("Lobby not found");

    const payload = {
      chat_id: lobby.id,
      sender_address: senderAddress.toLowerCase(),
      body: body.trim(),
    };

    const { data, error } = await supa.from("messages").insert(payload).select().single();
    if (error) throw error;

    return NextResponse.json({ ok: true, message: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
