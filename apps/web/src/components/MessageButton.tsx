'use client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function MessageButton({ peerAddress, owner }: { peerAddress: string; owner: string }) {
  const router = useRouter();
  const onClick = useCallback(async () => {
    const res = await fetch('/api/chats/dm', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-owner-address': owner },
      body: JSON.stringify({ peerAddress }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok) {
      alert(String(j?.error ?? 'Failed to start DM'));
      return;
    }
    router.push(`/chats/${j.id}`);
  }, [peerAddress, owner, router]);

  return (
    <button
      type="button"
      className="rounded-md border px-2 py-1 text-sm hover:bg-neutral-50"
      onClick={onClick}
      aria-label="Message"
      title="Message"
    >
      Message
    </button>
  );
}
