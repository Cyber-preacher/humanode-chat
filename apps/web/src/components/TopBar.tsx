"use client"
import Link from "next/link"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { BiomapBadge } from "@/components/BiomapBadge"
import { AccountPill } from "@/components/AccountPill"
import { useBiomap } from "@/hooks/useBiomap"

export function TopBar() {
  const { address, isConnected } = useAccount()
  const { biomapped, loading } = useBiomap(address)

  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-2 ring-4 ring-fuchsia-500 bg-white/80 backdrop-blur px-2 py-1 rounded-md">
      <ConnectButton />
      {isConnected && address ? (
        <>
          <AccountPill address={address} />
          <BiomapBadge address={address} />
          {!loading && biomapped === false ? (
            <Link
              href="/gate"
              className="rounded-md border px-2 py-0.5 text-xs hover:bg-neutral-50"
              aria-label="Verify with Biomapper"
            >
              Verify (Biomap)
            </Link>
          ) : null}
          <span data-debug="topbar-online" className="ml-1 text-xs text-fuchsia-700">TOPBAR</span>
        </>
      ) : null}
    </div>
  )
}