'use client';

import Link from 'next/link';
import { useState } from 'react';

type Chat = {
  id: string;
  slug: string;
  title: string;
};

/**
 * Minimal chat list:
 * - Always shows "Lobby"
 * - Later you can fetch /api/chats and replace the hardcoded list.
 */
export default function ChatList() {
  // Only need the value for now; drop the setter to avoid no-unused-vars
  const [chats] = useState<Chat[]>([{ id: 'lobby', slug: 'lobby', title: 'Lobby' }]);

  return (
    <div className="flex flex-col gap-2">
      {chats.map((c) => (
        <Link
          key={c.slug}
          href={`/chats/${encodeURIComponent(c.slug)}`}
          className="rounded-lg border px-3 py-2 hover:bg-gray-50"
        >
          {c.title}
        </Link>
      ))}

      <button
        type="button"
        className="mt-4 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        onClick={() => {
          // Placeholder for future "create chat"
        }}
      >
        New chat (soon)
      </button>
    </div>
  );
}
