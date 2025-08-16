// apps/web/src/components/NicknameForm.tsx
'use client';

import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { getSetNicknameConfig } from '@/lib/biomap';

export default function NicknameForm() {
  const [nickname, setNickname] = useState('');
  const { data: txHash, isPending, writeContractAsync } = useWriteContract();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;

    const cfg = await getSetNicknameConfig(nickname.trim());
    await writeContractAsync(cfg);
    setNickname('');
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 items-center">
      <input
        className="border rounded px-2 py-1"
        placeholder="Your nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <button type="submit" disabled={isPending} className="border px-3 py-1 rounded">
        {isPending ? 'Setting…' : 'Set nickname'}
      </button>
      {txHash && <span className="text-xs opacity-70">tx: {String(txHash).slice(0, 10)}…</span>}
    </form>
  );
}
