"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type MessageRow = {
  id: string;
  chat_id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

export default function LobbyChat() {
  const { address, isConnected } = useAccount();
  const supa = useMemo(() => getSupabaseBrowser(), []);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const subRef = useRef<ReturnType<typeof supa.channel> | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);

  // 1) Find lobby chat_id (browser can read it via RLS)
  async function fetchLobbyId() {
    const { data, error } = await supa
      .from("chats")
      .select("id")
      .eq("slug", "lobby")
      .single();
    if (error || !data) throw error || new Error("Lobby not found");
    setLobbyId(data.id);
    return data.id;
  }

  // 2) Load recent messages (server route or direct supabase)
  async function loadInitial(lobby: string) {
    // Direct query with anon key (RLS limits you to lobby)
    const { data, error } = await supa
      .from("messages")
      .select("id, chat_id, sender_address, body, created_at")
      .eq("chat_id", lobby)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    setMessages(data ?? []);
  }

  // 3) Subscribe to realtime inserts
  function subscribe(lobby: string) {
    // Clean old sub
    if (subRef.current) supa.removeChannel(subRef.current);

    const channel = supa
      .channel("lobby-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${lobby}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => [...prev, row]);
        }
      )
      .subscribe();
    subRef.current = channel;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const id = await fetchLobbyId();
        if (cancelled) return;
        await loadInitial(id);
        if (cancelled) return;
        subscribe(id);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (subRef.current) supa.removeChannel(subRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const text = body.trim();
    if (!isConnected || !address || text.length === 0) return;

    setSending(true);
    const optimistic: MessageRow = {
      id: `tmp-${Date.now()}`,
      chat_id: lobbyId ?? "",
      sender_address: address,
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
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      // Realtime will append the canonical row; remove the optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } catch (e: any) {
      // rollback on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
      alert(`Send failed: ${e.message || e}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        background: "#0b0f19", // darkened
        color: "#e6e9ef",
      }}
    >
      <h3 style={{ marginBottom: 8 }}>Lobby (public)</h3>

      {loading ? (
        <p style={{ opacity: 0.8 }}>Loading…</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 8,
            maxHeight: 360,
            overflowY: "auto",
            paddingRight: 8,
            background: "#0f1629",
            borderRadius: 8,
            border: "1px solid #1f2a44",
          }}
        >
          {messages.length === 0 ? (
            <p style={{ opacity: 0.75, padding: 8 }}>No messages yet. Say hi 👋</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: 10,
                  background: "#111a2e",
                  borderRadius: 8,
                  border: "1px solid #22304e",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  {m.sender_address.slice(0, 6)}…{m.sender_address.slice(-4)} •{" "}
                  {new Date(m.created_at).toLocaleTimeString()}
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.body}</div>
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
            border: "1px solid #2a3b61",
            borderRadius: 8,
            background: "#0f1629",
            color: "#e6e9ef",
          }}
        />
        <button
          onClick={send}
          disabled={!isConnected || sending || body.trim().length === 0}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #2a3b61",
            background: "#1b2540",
            color: "#e6e9ef",
            opacity: !isConnected || body.trim().length === 0 ? 0.6 : 1,
            cursor: !isConnected || body.trim().length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
