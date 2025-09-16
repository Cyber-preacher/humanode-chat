'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';

type Props = {
  peerAddress: `0x${string}`;
  className?: string;
  children?: React.ReactNode; // optional custom label
};

/**
 * Minimal client-side button that POSTs to /api/chats/dm
 * and navigates to /chats/[id] on success.
 *
 * Notes:
 * - Reads connected wallet via wagmi (RainbowKit already wired in providers).
 * - Sends x-owner-address header (server requires it).
 * - Handles 403 nickname gate with a simple alert for now.
 */
export default function StartDmButton({ peerAddress, className, children }: Props) {
  const { address } = useAccount();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onClick() {
    if (!address) {
      // Keep it simple; can be replaced by a toast later
      alert('Connect your wallet first.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/chats/dm', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-owner-address': address,
        },
        body: JSON.stringify({ peerAddress }),
      });

      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };

      if (res.status === 403) {
        alert('Both participants must be biomapped to start a DM.');
        return;
      }
      if (!res.ok || !data?.id) {
        alert(data?.error ?? 'Failed to create DM.');
        return;
      }

      // Server returns canonical id like dm:<a>:<b>
      router.push(`/chats/${encodeURIComponent(data.id)}`);
    } catch (err) {
      console.error(err);
      alert('Unexpected error starting DM.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        className ??
        'inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium ' +
          'bg-black text-white hover:opacity-90 disabled:opacity-50'
      }
      aria-busy={busy}
    >
      {busy ? 'Starting…' : children ?? 'Message'}
    </button>
  );
}
