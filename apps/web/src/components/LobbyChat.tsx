"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

type LobbyListResponse =
  | { ok: true; messages: Message[] }
  | { ok: false; error: string };

type LobbyPostResponse =
  | { ok: true; message: Message }
  | { ok: false; error: string };

export default function LobbyChat() {
  const { address, isConnected } = useAccount();
  const supa = useMemo(() => getSupabaseBrowser(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // Realtime subscription + lobby id
  const subRef = useRef<ReturnType<typeof supa.channel> | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/lobby/messages?limit=100", { cache: "no-store" });
      const json = (await res.json()) as unknown;
      const data = json as LobbyListResponse;

      if ("ok" in data && data.ok) {
        setMessages(data.messages);
        setLastError(null);
      } else {
        const err = ("error" in (data as { error?: string }) && (data as unknown as { error?: string }).error) || "Failed to load";
        setLastError(String(err));
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    load();

    async function setupRealtime() {
      const { data, error } = await supa
        .from("chats")
        .select("id")
        .eq("slug", "lobby")
        .single();

      if (error || !data?.id || !mounted) return;
      setLobbyId(data.id);

      const channel = supa
        .channel("lobby-messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${data.id}` },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const msg: Message = {
              id: String(row.id ?? ""),
              sender_address: String(row.sender_address ?? ""),
              body: String(row.body ?? ""),
              created_at: String(row.created_at ?? new Date().toISOString()),
            };
            setMessages((prev) => [...prev, msg]);
          }
        )
        .subscribe();

      subRef.current = channel;
    }

    setupRealtime();

    return () => {
      mounted = false;
      const ch = subRef.current;
      if (ch) {
        supa.removeChannel(ch);
        subRef.current = null;
      }
    };
  }, [supa]);

  async function send() {
    const text = body.trim();
    if (!isConnected || !address || text.length === 0) return;

    setSending(true);
    setLastError(null);

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender_address: address.toLowerCase(),
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");

    try {
      const res = await fetch("/api/lobby/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ senderAddress: address, body: text }),
      });
      const json = (await res.json()) as unknown;
      const data = json as LobbyPostResponse;

      if (!("ok" in data) || !data.ok) {
        const err = ("error" in (data as { error?: string }) && (data as unknown as { error?: string }).error) || "Failed";
        throw new Error(String(err));
      }

      // Refresh to replace the optimistic row with canonical
      await load();
    } catch (e) {
      // rollback optimistic message and show error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
      setLastError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  // simple dark styles
  const border = "1px solid #2d2f36";
  const bgCard = "#0f1115";
  const bgMsg = "#161a22";
  const textMuted = "#a0a3ad";

  return (
    <section
      style={{
        border,
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        background: bgCard,
        color: "#e5e7eb",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Lobby (public)</h3>

      {lastError && (
        <div
          style={{
            background: "#3b0d0d",
            border: "1px solid #6b1b1b",
            padding: 8,
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <strong>Error:</strong> {lastError}
        </div>
      )}

      {loading ? (
        <p style={{ color: textMuted }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 8 }}>
          {messages.length === 0 ? (
            <p style={{ color: textMuted }}>No messages yet. Say hi 👋</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} style={{ padding: 8, background: bgMsg, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}>
                  {m.sender_address.slice(0, 6)}…{m.sender_address.slice(-4)} •{" "}
                  {new Date(m.created_at).toLocaleTimeString()}
                  {m.id.startsWith("tmp-") ? " • sending…" : ""}
                </div>
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          placeholder={isConnected ? "Write a message" : "Connect wallet to chat"}
          disabled={!isConnected || sending}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{
            padding: 10,
            flex: 1,
            border: "1px solid #3a3d45",
            background: "#0b0d12",
            color: "#e5e7eb",
            borderRadius: 8,
          }}
        />
        <button
          onClick={send}
          disabled={!isConnected || sending || body.trim().length === 0}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: sending || body.trim().length === 0 ? "#2a2e37" : "#2563eb",
            color: "#fff",
            border: "none",
            cursor:
              !isConnected || sending || body.trim().length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: textMuted }}>
        {isConnected
          ? `Connected as ${address?.slice(0, 6)}…${address?.slice(-4)}`
          : "Connect wallet to participate."}
      </div>
    </section>
  );
}
