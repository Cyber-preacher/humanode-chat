'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { BiomapBadge } from './BiomapBadge';
import { AccountPill } from './AccountPill';

export function TopBar() {
  const { address, isConnected } = useAccount();
  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-2">
      <ConnectButton />
      {isConnected && address ? (
        <>
          <AccountPill address={address} />
          <BiomapBadge address={address} />
        </>
      ) : null}
    </div>
  );
}
