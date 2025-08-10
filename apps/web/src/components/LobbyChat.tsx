"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

type Message = {
  id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

type GetResp =
  | { ok: true; messages: Message[] }
  | { ok: false; error: string };

type PostResp =
  | { ok: true; message: Message }
  | { ok: false; error: string };

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return "Unknown error";
  }
}

export default function LobbyChat() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<number | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/lobby/messages?limit=100", { cache: "no-store" });
      const json = (await res.json()) as GetResp;
      if (json.ok) setMessages(json.messages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    pollRef.current = window.setInterval(() => void load(), 5000) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  async function send() {
    const text = body.trim();
    if (!isConnected || !address || text.length === 0) return;

    setSending(true);
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
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
      const json = (await res.json()) as PostResp;
      if (!json.ok) throw new Error(json.error || "Failed");
      await load(); // replace optimistic item with canonical row
    } catch (e: unknown) {
      // rollback on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
      alert(`Send failed: ${errMsg(e)}`);
    } finally {
      setSending(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    background: "var(--card-bg, #fff)",
    color: "var(--card-fg, #111827)",
  };

  const msgStyle: React.CSSProperties = {
    padding: 8,
    background: "var(--bubble-bg, #f9fafb)",
    borderRadius: 8,
  };

  return (
    <section style={cardStyle}>
      <style>{`
        :root {
          --card-bg: #ffffff;
          --card-fg: #111827;
          --bubble-bg: #f9fafb;
          --muted: #6b7280;
          --border: #e5e7eb;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --card-bg: #0f172a;
            --card-fg: #e5e7eb;
            --bubble-bg: #111827;
            --muted: #9ca3af;
            --border: #334155;
          }
        }
      `}</style>

      <h3 style={{ marginTop: 0 }}>Lobby (public)</h3>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: "grid", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 8 }}>
          {messages.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No messages yet. Say hi 👋</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} style={msgStyle}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {m.sender_address.slice(0, 6)}…{m.sender_address.slice(-4)} •{" "}
                  {new Date(m.created_at).toLocaleTimeString()}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
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
            padding: 8,
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--card-bg)",
            color: "var(--card-fg)",
          }}
        />
        <button
          onClick={() => void send()}
          disabled={!isConnected || sending || body.trim().length === 0}
          style={{ padding: "8px 12px", borderRadius: 8, opacity: !isConnected || sending || body.trim().length === 0 ? 0.6 : 1 }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
