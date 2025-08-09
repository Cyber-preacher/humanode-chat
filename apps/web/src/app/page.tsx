"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { humanodeTestnet5 } from "@/lib/humanode";
import { ProfileRegistryAbi } from "@/abi/ProfileRegistry";
import NicknameForm from "@/components/NicknameForm";
import LobbyChat from "@/components/LobbyChat";

// Contracts (env overrides allowed)
const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`;
const BIOMAPPER_LOG =
  ((process.env.NEXT_PUBLIC_BIOMAPPER_LOG as `0x${string}`) ||
    "0x3f2B3E471b207475519989369d5E4F2cAbd0A39F") as `0x${string}`;

// Minimal ABI for BiomapperLog read helpers we use
const BiomapperLogAbi = [
  { type: "function", stateMutability: "view", name: "generationsHead", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    stateMutability: "view",
    name: "generationBiomapping",
    inputs: [
      { name: "who", type: "address" },
      { name: "generationPointer", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 999,
        background: ok ? "#16a34a" : "#dc2626",
        marginRight: 8,
      }}
    />
  );
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [newNick, setNewNick] = useState("");

  const isOnHumanode = isConnected && chainId === humanodeTestnet5.id;
  const canTypeNick = newNick.trim().length > 0;

  // Current nickname
  const {
    data: nickname,
    refetch: refetchNick,
    isFetching: isFetchingNick,
  } = useReadContract({
    abi: ProfileRegistryAbi,
    address: PROFILE_REGISTRY,
    functionName: "getNickname",
    args: address ? [address as `0x${string}`] : undefined,
    chainId: humanodeTestnet5.id,
    query: { enabled: Boolean(address) } as const,
  });

  // Biomapper checks
  const { data: genHead } = useReadContract({
    abi: BiomapperLogAbi,
    address: BIOMAPPER_LOG,
    functionName: "generationsHead",
    chainId: humanodeTestnet5.id,
    query: { enabled: Boolean(isOnHumanode) } as const,
  });

  const { data: mappingPtr, isFetching: isFetchingMap } = useReadContract({
    abi: BiomapperLogAbi,
    address: BIOMAPPER_LOG,
    functionName: "generationBiomapping",
    args: address && typeof genHead === "bigint" ? [address as `0x${string}`, genHead] : undefined,
    chainId: humanodeTestnet5.id,
    query: { enabled: Boolean(isOnHumanode && address && typeof genHead === "bigint") } as const,
  });

  const isBiomapped = typeof mappingPtr === "bigint" ? mappingPtr > BigInt(0) : false; // BigInt literal-safe for CI
  const hasNickname = typeof nickname === "string" && nickname.length > 0;

  const canSubmit = isOnHumanode && canTypeNick && isBiomapped && !isPending;

  async function onSetNickname() {
    if (!canSubmit) return;
    await writeContractAsync({
      abi: ProfileRegistryAbi,
      address: PROFILE_REGISTRY,
      functionName: "setNickname",
      args: [newNick.trim()],
      chainId: humanodeTestnet5.id,
    });
    setNewNick("");
    await refetchNick();
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1>🚀 Humanode Chat</h1>
      <ConnectButton />

      {!isConnected && <p>Connect your wallet to continue.</p>}

      {isConnected && !isOnHumanode && (
        <p style={{ color: "crimson" }}>
          You are on chain {chainId}. Please switch to Humanode Testnet-5 (Chain ID 14853).
        </p>
      )}

      {isConnected && isOnHumanode && (
        <>
          <section
            style={{
              border: "1px solid #e5e7eb",
              padding: 16,
              borderRadius: 12,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Dot ok={isBiomapped} />
              <strong>
                Biomapper status: {isFetchingMap ? "Checking…" : isBiomapped ? "Verified" : "Not biomapped"}
              </strong>
            </div>

            {!isBiomapped && (
              <p style={{ fontSize: 14 }}>
                Only biomapped users can set a nickname.{" "}
                <a
                  href="https://testnet5.biomapper.hmnd.app/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "underline" }}
                >
                  Go biomap ↗
                </a>
              </p>
            )}

            {!hasNickname ? (
              <>
                <NicknameForm
                  newNick={newNick}
                  setNewNick={setNewNick}
                  onSubmit={onSetNickname}
                  isSubmitting={isPending}
                  canSubmit={canSubmit}
                />
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {isFetchingNick
                    ? "Refreshing nickname…"
                    : !canTypeNick
                    ? "Type a nickname to enable the button."
                    : null}
                </div>
              </>
            ) : (
              <p>
                Welcome, <strong>{nickname}</strong>. {isFetchingNick ? "Refreshing…" : "✅ Biomapper check passed."}
              </p>
            )}
          </section>

          {hasNickname && <LobbyChat />}
        </>
      )}
    </main>
  );
}
