'use client';

function short(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export function AccountPill({ address }: { address: string }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs text-neutral-700 bg-white/70 backdrop-blur">
      {short(address)}
    </span>
  );
}
