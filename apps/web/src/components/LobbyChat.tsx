'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { requireGetChatMessages, requirePostChatMessage, type Message } from '@/lib/api/chat';

/**
 * Lobby chat:
 * - Loads messages via GET /api/chats/lobby/messages
 * - Sends via POST /api/chats/lobby/messages
 * - Optional realtime subscription once we know lobby's chat_id
 */
export default function LobbyChat() {
  const { address } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // infer the lobby chat_id from any message we already have
  const lobbyChatId = useMemo(() => messages.find((m) => m.chat_id)?.chat_id ?? null, [messages]);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const msgs = await requireGetChatMessages('lobby', 50);
        if (!mounted) return;
        setMessages(msgs);
      } catch (e) {
        console.error('Failed to load lobby messages:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // auto-scroll on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // subscribe to realtime inserts for this chat
  useEffect(() => {
    if (!lobbyChatId) return;

    const supa = getSupabaseBrowser();
    const channel = supa.channel('realtime:public:messages:lobby').on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${lobbyChatId}`,
      },
      (payload: RealtimePostgresInsertPayload<Message>) => {
        setMessages((prev) => [...prev, payload.new]);
      },
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('[realtime] subscribed to lobby messages');
    });

    return () => {
      supa.removeChannel(channel);
    };
  }, [lobbyChatId]);

  async function sendMessage() {
    if (!address) {
      alert('Connect your wallet first.');
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) return;

    setPosting(true);
    try {
      const msg = await requirePostChatMessage('lobby', {
        senderAddress: address,
        body: trimmed,
      });
      setMessages((prev) => [...prev, msg]); // optimistic
      setBody('');
    } catch (e) {
      alert(`Failed to send: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-lg font-semibold"># Lobby</div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto rounded-xl border p-3"
        style={{ minHeight: 240 }}
      >
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet. Say hi 👋</div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id} className="rounded-md bg-gray-50 p-2">
                <div className="text-xs text-gray-500">
                  {m.sender_address.slice(0, 6)}…{m.sender_address.slice(-4)} ·{' '}
                  {new Date(m.created_at).toLocaleString()}
                </div>
                <div className="whitespace-pre-wrap text-sm">{m.body}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
      >
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder={address ? 'Type a message…' : 'Connect wallet to chat'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!address || posting}
          maxLength={2000}
        />
        <button
          type="submit"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={!address || posting || body.trim() === ''}
        >
          {posting ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
