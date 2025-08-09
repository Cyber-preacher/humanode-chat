"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAccount } from "wagmi";

type Message = {
  id: string;
  chat_id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

export default function LobbyPage() {
  const { address } = useAccount();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  // initial fetch
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/lobby/messages?limit=50", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setMsgs(json.messages);
      setLoading(false);
    })();
  }, []);

  // realtime (table-wide; filter client-side to keep it simple)
  useEffect(() => {
    const supa = getSupabaseBrowser();
    const channel = supa
      .channel("realtime:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        // optimistic: just append (lobby-only insertions come via API anyway)
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .subscribe();

    return () => {
      supa.removeChannel(channel);
    };
  }, []);

  // autoscroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);

  async function send() {
    if (!address) return;
    const text = body.trim();
    if (!text) return;

    // POST via our server route (uses Service Role)
    const res = await fetch("/api/lobby/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ senderAddress: address, body: text }),
    });
    const json = await res.json();
    if (!json.ok) {
      alert(json.error || "Failed to send");
      return;
    }
    setBody("");
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1>💬 Public Lobby</h1>
      {!address && <p>Connect your wallet on the home page to send messages.</p>}

      <div
        ref={listRef}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          height: 420,
          overflowY: "auto",
          padding: 12,
          background: "#fafafa",
        }}
      >
        {loading ? (
          <p>Loading…</p>
        ) : msgs.length === 0 ? (
          <p>No messages yet. Say hi! 👋</p>
        ) : (
          msgs.map((m) => (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {m.sender_address.slice(0, 6)}…{m.sender_address.slice(-4)} ·{" "}
                {new Date(m.created_at).toLocaleTimeString()}
              </div>
              <div>{m.body}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder={address ? "Type your message…" : "Connect wallet to chat"}
          value={body}
          disabled={!address}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && body.trim()) send();
          }}
          style={{ padding: 10, flex: 1, border: "1px solid #d1d5db", borderRadius: 8 }}
        />
        <button
          onClick={send}
          disabled={!address || !body.trim()}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            opacity: !address || !body.trim() ? 0.6 : 1,
            cursor: !address || !body.trim() ? "not-allowed" : "pointer",
          }}
        >
          Send
        </button>
      </div>
    </main>
  );
}
