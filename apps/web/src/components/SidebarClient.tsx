// apps/web/src/components/SidebarClient.tsx
'use client';

import React from 'react';
import useSWR from 'swr';

type Chat = {
  id: string;
  title?: string | null;
  lastMessage?: { text?: string | null; createdAt?: string | null } | null;
};

type Contact = {
  id: string;
  owner_address: string;
  contact_address: string;
  label?: string | null;
};

type ChatsResp = { chats: Chat[] };
type ContactsResp = { contacts: Contact[]; ok?: boolean };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SidebarClient({
  initialChats,
  initialContacts,
}: {
  initialChats: Chat[];
  initialContacts: Contact[];
}) {
  const [tab, setTab] = React.useState<'chats' | 'contacts'>('chats');
  const [query, setQuery] = React.useState('');

  const {
    data: chatsData,
    isLoading: chatsLoading,
    error: chatsError,
    mutate: mutateChats,
  } = useSWR<ChatsResp, Error>('/api/chats', fetcher, {
    fallbackData: { chats: initialChats },
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const {
    data: contactsData,
    isLoading: contactsLoading,
    error: contactsError,
    mutate: mutateContacts,
  } = useSWR<ContactsResp, Error>(
    // Our GET supports ?ownerAddress but falls back to all without it
    '/api/contacts',
    fetcher,
    {
      fallbackData: { contacts: initialContacts },
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const chats = (chatsData?.chats ?? []).filter(
    (c) =>
      !query ||
      (c.title ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (c.lastMessage?.text ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const contacts = (contactsData?.contacts ?? []).filter((c) => {
    const nick = (c.label ?? '').toLowerCase();
    const addr = (c.contact_address ?? '').toLowerCase();
    const q = query.toLowerCase();
    return !q || nick.includes(q) || addr.includes(q);
  });

  const onDeleteContact = async (id: string) => {
    const prev = contactsData;
    // optimistic remove
    mutateContacts((cur) => ({ contacts: (cur?.contacts ?? []).filter((c) => c.id !== id) }), {
      revalidate: false,
    });
    try {
      const owner = window.localStorage.getItem('ownerAddress') || ''; // TEMP until biomapper gate/session
      const res = await fetch(`/api/contacts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: owner ? { 'x-owner-address': owner } : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      await mutateContacts();
    } catch (e) {
      mutateContacts(prev, false); // rollback
      alert(`Failed to delete contact: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b p-3">
        <div className="text-lg font-semibold">Inbox</div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setTab('chats')}
            className={`rounded px-2 py-1 ${tab === 'chats' ? 'bg-muted font-medium' : ''}`}
          >
            Chats
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setTab('contacts')}
            className={`rounded px-2 py-1 ${tab === 'contacts' ? 'bg-muted font-medium' : ''}`}
          >
            Contacts
          </button>
        </div>
        <div className="mt-2">
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {tab === 'chats' ? (
          <ChatListSection
            isLoading={chatsLoading}
            error={chatsError}
            items={chats}
            emptyLabel="No chats yet"
          />
        ) : (
          <ContactsSection
            isLoading={contactsLoading}
            error={contactsError}
            items={contacts}
            onDelete={onDeleteContact}
          />
        )}
      </div>

      <footer className="border-t p-3">
        <NewChatButtons onChatsMutate={() => mutateChats()} />
      </footer>
    </div>
  );
}

function ChatListSection({
  isLoading,
  error,
  items,
  emptyLabel,
}: {
  isLoading: boolean;
  error: unknown; // was any
  items: Chat[];
  emptyLabel: string;
}) {
  if (isLoading) return <SkeletonList count={6} />;
  if (error) return <ErrorBlock message="Failed to load chats." />;
  if (!items.length) return <EmptyBlock label={emptyLabel} />;

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="p-3 hover:bg-muted/50">
          <a href={`/chats/${item.id}`} className="block">
            <div className="font-medium">{item.title ?? 'Untitled chat'}</div>
            {item.lastMessage?.text ? (
              <div className="line-clamp-1 text-sm text-muted-foreground">
                {item.lastMessage.text}
              </div>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

function ContactsSection({
  isLoading,
  error,
  items,
  onDelete,
}: {
  isLoading: boolean;
  error: unknown; // was any
  items: Contact[];
  onDelete: (id: string) => void;
}) {
  if (isLoading) return <SkeletonList count={6} />;
  if (error) return <ErrorBlock message="Failed to load contacts." />;
  if (!items.length) return <EmptyBlock label="No contacts yet" />;

  return (
    <ul className="divide-y">
      {items.map((c) => (
        <li key={c.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
          <a href={`/chats/dm?address=${encodeURIComponent(c.contact_address)}`} className="flex-1">
            <div className="font-medium">{c.label || short(c.contact_address)}</div>
            <div className="text-xs text-muted-foreground">{short(c.contact_address)}</div>
          </a>
          <button
            onClick={() => onDelete(c.id)}
            className="rounded border px-2 py-1 text-xs hover:bg-destructive hover:text-destructive-foreground"
            title="Remove contact"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <ul className="animate-pulse divide-y">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="p-3">
          <div className="mb-2 h-4 w-1/2 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return <div className="p-4 text-sm text-red-600">{message}</div>;
}

function EmptyBlock({ label }: { label: string }) {
  return <div className="p-4 text-sm text-muted-foreground">{label}</div>;
}

function NewChatButtons({ onChatsMutate }: { onChatsMutate: () => void }) {
  const onNewPublic = async () => {
    const title = prompt('Public room title?');
    if (!title) return;
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      alert('Failed to create chat');
      return;
    }
    const { id } = await res.json();
    onChatsMutate();
    location.href = `/chats/${id}`;
  };

  const onNewDM = async () => {
    const address = prompt('Direct message with address (0x…)?');
    if (!address) return;
    const res = await fetch('/api/chats/dm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    if (!res.ok) {
      alert('Failed to start DM');
      return;
    }
    const { id } = await res.json();
    onChatsMutate();
    location.href = `/chats/${id}`;
  };

  return (
    <div className="flex gap-2">
      <button className="rounded border px-3 py-1" onClick={onNewPublic}>
        New public chat
      </button>
      <button className="rounded border px-3 py-1" onClick={onNewDM}>
        New DM
      </button>
    </div>
  );
}

function short(addr: string) {
  return addr?.startsWith('0x') ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
