// apps/web/src/components/ChatRoom.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const EthAddr = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

type Message = {
    id: string;
    chat_id: string;
    sender_address: string;
    body: string;
    created_at: string;
};

type MessagesResponse =
    | { ok: true; messages: Message[] }
    | { ok: false; error: string };

type PostResponse =
    | { ok: true; message: Message }
    | { ok: false; error: string };

export default function ChatRoom({
    chatId,
    senderAddress,
}: {
    chatId: string;
    senderAddress: string;
}) {
    const validAddress = useMemo(() => {
        try {
            return EthAddr.parse(senderAddress.toLowerCase());
        } catch {
            return "";
        }
    }, [senderAddress]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [body, setBody] = useState("");
    const [error, setError] = useState("");
    const [posting, setPosting] = useState(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/chats/${encodeURIComponent(chatId)}/messages?limit=50`,
                { method: "GET" }
            );
            const json = (await res.json()) as MessagesResponse;
            if (!json.ok) throw new Error(json.error);
            setMessages(json.messages);
        } catch (e) {
            setError((e as Error).message || "Failed to load messages");
        }
    }, [chatId]);

    useEffect(() => {
        void fetchMessages();
        const id = setInterval(fetchMessages, 3000);
        return () => clearInterval(id);
    }, [fetchMessages]);

    useEffect(() => {
        // scroll to bottom when messages change
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function onSend(e: React.FormEvent) {
        e.preventDefault();
        if (!validAddress || !body.trim()) return;

        setPosting(true);
        setError("");

        try {
            const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    senderAddress: validAddress,
                    body,
                }),
            });
            const json = (await res.json()) as PostResponse;
            if (!json.ok) {
                throw new Error(json.error || "Send failed");
            }
            setBody("");
            // optimistically append or just refetch
            await fetchMessages();
        } catch (e) {
            setError((e as Error).message || "Failed to send");
        } finally {
            setPosting(false);
        }
    }

    return (
        <div className="space-y-4">
            {!validAddress ? (
                <p className="text-sm text-red-600">
                    Provide a valid <code>address</code> query param (0x…) to send messages.
                </p>
            ) : null}

            <div className="border rounded-lg p-3 h-[50vh] overflow-y-auto bg-white">
                {messages.length === 0 ? (
                    <p className="text-sm text-gray-500">No messages yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {messages.map((m) => (
                            <li key={m.id} className="text-sm">
                                <div className="text-gray-500 text-xs">
                                    {new Date(m.created_at).toLocaleString()} —{" "}
                                    <span className="break-all">{m.sender_address}</span>
                                </div>
                                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                            </li>
                        ))}
                    </ul>
                )}
                <div ref={bottomRef} />
            </div>

            <form className="flex gap-2" onSubmit={onSend}>
                <input
                    disabled={!validAddress}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={validAddress ? "Type a message…" : "Enter a valid address above"}
                    className="flex-1 border rounded-lg px-3 py-2"
                />
                <button
                    type="submit"
                    disabled={!validAddress || posting || !body.trim()}
                    className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                >
                    {posting ? "Sending…" : "Send"}
                </button>
            </form>

            {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        </div>
    );
}
