'use client';
import { useBiomap } from '@/hooks/useBiomap';

export function BiomapBadge({ address }: { address?: string }) {
  const { loading, biomapped } = useBiomap(address);
  if (!address) return null;
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        biomapped ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-700',
      ].join(' ')}
      title={loading ? 'Checking biomap status…' : biomapped ? 'Biomapped' : 'Not biomapped'}
      aria-live="polite"
    >
      {loading ? 'Checking…' : biomapped ? '✅ Biomapped' : '○ Not biomapped'}
    </span>
  );
}
