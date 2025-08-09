"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

type Message = {
  id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

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
      const json: { ok: boolean; messages?: Message[] } = await res.json();
      if (json.ok && Array.isArray(json.messages)) setMessages(json.messages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    pollRef.current = window.setInterval(load, 5000) as unknown as number;
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
      const json: { ok: boolean; error?: string } = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      await load(); // replace optimistic item with canonical row
    } catch (e) {
      // rollback on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
      alert(`Send failed: ${e instanceof Error ? e.message : String(e)}`);
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
        background: "#0b1220",
        color: "#e5e7eb",
      }}
    >
      <h3 style={{ marginBottom: 8 }}>Lobby (public)</h3>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 8,
            maxHeight: 360,
            overflowY: "auto",
            paddingRight: 8,
            background: "#0f172a",
            borderRadius: 8,
            padding: 8,
          }}
        >
          {messages.length === 0 ? (
            <p style={{ opacity: 0.8 }}>No messages yet. Say hi 👋</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: 8,
                  background: "#111827",
                  borderRadius: 8,
                  border: "1px solid #1f2937",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {m.sender_address.slice(0, 6)}…{m.sender_address.slice(-4)} •{" "}
                  {new Date(m.created_at).toLocaleTimeString()}
                </div>
                <div style={{ marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {m.body}
                </div>
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
            border: "1px solid #374151",
            background: "#111827",
            color: "#e5e7eb",
            borderRadius: 8,
          }}
        />
        <button
          onClick={send}
          disabled={!isConnected || sending || body.trim().length === 0}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#2563eb",
            color: "white",
            opacity: !isConnected || sending || body.trim().length === 0 ? 0.6 : 1,
            cursor:
              !isConnected || sending || body.trim().length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
