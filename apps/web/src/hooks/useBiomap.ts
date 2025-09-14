'use client';
import { useEffect, useState } from 'react';
import { isAddress } from 'viem';

type State = { loading: boolean; biomapped: boolean | null; error?: string };

export function useBiomap(address?: string) {
  const [state, setState] = useState<State>({ loading: false, biomapped: null });
  useEffect(() => {
    if (!address || !isAddress(address)) {
      setState({ loading: false, biomapped: null });
      return;
    }
    let aborted = false;
    setState({ loading: true, biomapped: null });
    (async () => {
      try {
        const res = await fetch(`/api/biomap/${address}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (!aborted) {
          const ok = j?.ok !== false;
          setState({
            loading: false,
            biomapped: ok ? !!j?.biomapped : null,
            error: ok ? undefined : String(j?.error ?? 'Error'),
          });
        }
      } catch (e) {
        if (!aborted) setState({ loading: false, biomapped: null, error: String(e) });
      }
    })();
    return () => {
      aborted = true;
    };
  }, [address]);
  return state;
}
