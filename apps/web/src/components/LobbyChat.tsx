// apps/web/src/components/LobbyChat.tsx
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

<<<<<<< HEAD
=======
type LobbyListResponse =
  | { ok: true; messages: Message[] }
  | { ok: false; error: string };

type LobbyPostResponse =
  | { ok: true; message: Message }
  | { ok: false; error: string };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)
export default function LobbyChat() {
  const { address, isConnected } = useAccount();
  const supa = useMemo(() => getSupabaseBrowser(), []);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
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
=======
  const [lastError, setLastError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  async function load(): Promise<void> {
    try {
      const res = await fetch("/api/lobby/messages?limit=100", { cache: "no-store" });
      const json: LobbyListResponse = await res.json();
      if (json.ok) {
        setMessages(json.messages);
        setLastError(null);
      } else {
        setLastError(json.error || "Failed to fetch messages");
      }
    } catch (err: unknown) {
      setLastError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)
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

  async function send(): Promise<void> {
    const text = body.trim();
    if (!isConnected || !address || text.length === 0) return;

    setSending(true);
<<<<<<< HEAD
    const optimistic: MessageRow = {
=======
    setLastError(null);

    const optimistic: Message = {
>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)
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
<<<<<<< HEAD
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      // Realtime will append the canonical row; remove the optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } catch (e: any) {
      // rollback on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
      alert(`Send failed: ${e.message || e}`);
=======
      const json: LobbyPostResponse = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Failed to send message");
      }
      // Replace optimistic list with canonical
      await load();
    } catch (err: unknown) {
      // rollback
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
      setLastError(getErrorMessage(err));
>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)
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
<<<<<<< HEAD
        background: "#0b0f19", // darkened
        color: "#e6e9ef",
      }}
    >
      <h3 style={{ marginBottom: 8 }}>Lobby (public)</h3>
=======
        background: "#0b1220",
        color: "#e5e7eb",
      }}
    >
      <h3 style={{ marginTop: 0, color: "#f0f4ff" }}>Lobby (public)</h3>
>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)

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
<<<<<<< HEAD
            background: "#0f1629",
            borderRadius: 8,
            border: "1px solid #1f2a44",
          }}
        >
          {messages.length === 0 ? (
            <p style={{ opacity: 0.75, padding: 8 }}>No messages yet. Say hi 👋</p>
=======
          }}
        >
          {messages.length === 0 ? (
            <p style={{ opacity: 0.8 }}>No messages yet. Say hi 👋</p>
>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
<<<<<<< HEAD
                  padding: 10,
                  background: "#111a2e",
                  borderRadius: 8,
                  border: "1px solid #22304e",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
=======
                  padding: 8,
                  background: "#101826",
                  borderRadius: 8,
                  border: "1px solid #1f2a44",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>
>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)
                  {m.sender_address.slice(0, 6)}…{m.sender_address.slice(-4)} •{" "}
                  {new Date(m.created_at).toLocaleTimeString()}
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.body}</div>
              </div>
            ))
          )}
        </div>
      )}

      {lastError && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            background: "#3b0d0d",
            color: "#ffd7d7",
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #5a1515",
          }}
        >
          {lastError}
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
<<<<<<< HEAD
            border: "1px solid #2a3b61",
            borderRadius: 8,
            background: "#0f1629",
            color: "#e6e9ef",
=======
            border: "1px solid #334155",
            borderRadius: 8,
            background: "#0f172a",
            color: "#e5e7eb",
>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)
          }}
        />
        <button
          onClick={send}
          disabled={!isConnected || sending || body.trim().length === 0}
          style={{
<<<<<<< HEAD
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #2a3b61",
            background: "#1b2540",
            color: "#e6e9ef",
            opacity: !isConnected || body.trim().length === 0 ? 0.6 : 1,
            cursor: !isConnected || body.trim().length === 0 ? "not-allowed" : "pointer",
=======
            padding: "8px 12px",
            borderRadius: 8,
            background: "#2563eb",
            color: "white",
            opacity: !isConnected || sending || body.trim().length === 0 ? 0.6 : 1,
            cursor:
              !isConnected || sending || body.trim().length === 0 ? "not-allowed" : "pointer",
            border: "none",
>>>>>>> f90dd73 (fix(ci): replace 'any' with 'unknown' in LobbyChat and handle errors safely)
          }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
