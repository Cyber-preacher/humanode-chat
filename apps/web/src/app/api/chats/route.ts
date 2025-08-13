import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const Address = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
    .transform((s) => s.toLowerCase());

type ChatRow = { id: string; slug: string; is_public: boolean };

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const addrRaw = searchParams.get("address");
        if (!addrRaw) {
            return NextResponse.json({ ok: false, error: "Missing address" }, { status: 400 });
        }

        const parsed = Address.safeParse(addrRaw);
        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid address" },
                { status: 400 }
            );
        }
        const address = parsed.data;

        const supa = getSupabaseAdmin();

        const { data: publicChats, error: pubErr } = await supa
            .from("chats")
            .select("id, slug, is_public")
            .eq("is_public", true)
            .order("slug", { ascending: true });
        if (pubErr) throw pubErr;

        const { data: parts, error: partErr } = await supa
            .from("chat_participants")
            .select("chat_id")
            .eq("address", address);
        if (partErr) throw partErr;

        let privateChats: ChatRow[] = [];
        const ids = (parts ?? []).map((p) => p.chat_id);
        if (ids.length > 0) {
            const { data: priv, error: privErr } = await supa
                .from("chats")
                .select("id, slug, is_public")
                .in("id", ids)
                .eq("is_public", false);
            if (privErr) throw privErr;
            privateChats = priv ?? [];
        }

        const map = new Map<string, ChatRow>();
        (publicChats ?? []).forEach((c) => map.set(c.id, c));
        privateChats.forEach((c) => map.set(c.id, c));

        return NextResponse.json({ ok: true, chats: Array.from(map.values()) });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
