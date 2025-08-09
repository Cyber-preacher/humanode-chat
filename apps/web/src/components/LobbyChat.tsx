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
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/lobby/messages?limit=100", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) setMessages(json.messages ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // poll every 5s
    pollRef.current = window.setInterval(load, 5000) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!isConnected || !address || text.length === 0) return;

    setSending(true);

    // optimistic append
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender_address: address,
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");

    try {
      const resp = await fetch("/api/lobby/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ senderAddress: address, body: text }),
      });
      const json = await resp.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to send");
      await load(); // replace optimistic with canonical
    } catch (e: unknown) {
      // rollback on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  // ===== dark, high-contrast styles =====
  const wrap: React.CSSProperties = {
    border: "1px solid #1f2937",
    background: "#0f172a", // slate-900
    color: "#e5e7eb", // neutral-200
    borderRadius: 12,
    overflow: "hidden",
  };
  const header: React.CSSProperties = {
    padding: "10px 14px",
    borderBottom: "1px solid #1f2937",
    fontWeight: 600,
    background: "#111827",
  };
  const list: React.CSSProperties = {
    maxHeight: 360,
    overflowY: "auto",
    padding: 12,
    display: "grid",
    gap: 8,
  };
  const bubble: React.CSSProperties = {
    background: "#111827", // slate-800
    color: "#f9fafb",
    border: "1px solid #374151",
    borderRadius: 10,
    padding: "8px 10px",
    lineHeight: 1.35,
  };
  const meta: React.CSSProperties = {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 4,
  };
  const form: React.CSSProperties = {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #1f2937",
    background: "#0b1220",
  };
  const input: React.CSSProperties = {
    flex: 1,
    background: "#0b1220",
    color: "#f9fafb",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "10px 12px",
    outline: "none",
  };
  const button: React.CSSProperties = {
    background: "#2563eb",
    color: "#ffffff",
    border: "1px solid #1d4ed8",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: sending ? "wait" : "pointer",
    opacity: sending || !isConnected || body.trim().length === 0 ? 0.7 : 1,
  };

  return (
    <section style={wrap}>
      <div style={header}>💬 Lobby chat</div>

      <div ref={listRef} style={list}>
        {loading && messages.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>No messages yet. Say hi 👋</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={bubble}>
              <div style={meta}>
                {m.sender_address.slice(0, 6)}…{m.sender_address.slice(-4)} ·{" "}
                {new Date(m.created_at).toLocaleTimeString()}
              </div>
              <div>{m.body}</div>
            </div>
          ))
        )}
      </div>

      <div style={form}>
        <input
          style={input}
          placeholder={isConnected ? "Write a message…" : "Connect wallet to chat"}
          disabled={!isConnected || sending}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          style={button}
          onClick={send}
          disabled={!isConnected || sending || body.trim().length === 0}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </section>
  );
}
