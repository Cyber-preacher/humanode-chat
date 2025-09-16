'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addContact, deleteContact, listContacts, type Contact } from '@/lib/api/contacts';
import StartDmButton from '@/components/dm/StartDmButton';

type Props = { ownerAddress: string };

export default function ContactsList({ ownerAddress }: Props) {
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addr, setAddr] = useState('');
  const [alias, setAlias] = useState('');

  const owner = useMemo(() => ownerAddress?.toLowerCase() ?? '', [ownerAddress]);

  const refresh = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    setError(null);
    try {
      const { contacts } = await listContacts(owner);
      setItems(contacts);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await addContact(owner, addr.trim(), alias.trim() || undefined);
      setAddr('');
      setAlias('');
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to add');
    } finally {
      setAdding(false);
    }
  }

  async function onDelete(a: string) {
    try {
      await deleteContact(owner, a);
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to delete');
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Contacts</h2>

      <form onSubmit={onAdd} className="flex gap-2 items-center">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="0x… contact address"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          required
          aria-label="Contact address"
        />
        <input
          className="w-40 border rounded px-3 py-2 text-sm"
          placeholder="Alias (optional)"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          aria-label="Alias"
        />
        <button
          type="submit"
          disabled={adding || !addr}
          className="px-3 py-2 text-sm rounded bg-black text-white disabled:opacity-50"
          aria-label="Add contact"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500">No contacts yet.</p>
      ) : (
        <ul className="divide-y border rounded">
          {items.map((c) => (
            <li key={c.address} className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0">
                <div className="font-mono text-sm truncate">{c.address}</div>
                {c.alias && <div className="text-xs text-neutral-500 truncate">{c.alias}</div>}
              </div>
              <div className="flex items-center gap-3">
                <StartDmButton
                  peerAddress={c.address as `0x${string}`}
                  className="px-3 py-2 text-sm rounded bg-black text-white disabled:opacity-50"
                >
                  Message
                </StartDmButton>
                <button
                  onClick={() => onDelete(c.address)}
                  className="text-sm text-red-600 hover:underline"
                  aria-label={`Remove ${c.address}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
