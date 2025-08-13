'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ChatMessage } from '@/lib/api/chat';
import { fetchMessages, postMessage } from '@/lib/api/chat';

type Props = {
  /** Force a specific chat slug (e.g. for /lobby page). If not provided, use `/chats/[id]`. */
  chatSlug?: string;
};

export default function ChatView({ chatSlug }: Props) {
  const params = useParams();
  const routeSlug = useMemo(() => {
    const raw = (params as Record<string, unknown> | null)?.id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
    return undefined;
  }, [params]);

  const slug = chatSlug ?? routeSlug ?? 'lobby';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchMessages(slug, { limit: 100 });
        if (alive) setMessages(data);
      } catch (e) {
        console.error('Failed to load messages', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const body = text.trim();
    if (!body) return;

    // TODO: replace with the connected wallet address
    const senderAddress = '0x1111111111111111111111111111111111111111';

    setSending(true);
    try {
      const msg = await postMessage(slug, { senderAddress, body });
      setMessages(prev => [...prev, msg]);
      setText('');
    } catch (e) {
      alert('Failed to send message. Please try again.');
      console.error('postMessage error', e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-sm text-gray-600">
        Chat: <span className="font-mono">{slug}</span>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border p-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet.</div>
        ) : (
          <ul className="space-y-2">
            {messages.map(m => (
              <li key={m.id} className="rounded-md bg-gray-50 p-2">
                <div className="text-xs text-gray-500">
                  {m.sender_address} · {new Date(m.created_at).toLocaleString()}
                </div>
                <div className="whitespace-pre-wrap">{m.body}</div>
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border px-3 py-2"
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <button
          className="rounded-md border px-4 py-2 disabled:opacity-50"
          onClick={() => void handleSend()}
          disabled={sending || !text.trim()}
          type="button"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
