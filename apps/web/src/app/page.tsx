"use client";

import { useState, useMemo } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { humanodeTestnet5 } from "@/lib/humanode";
import { ProfileRegistryAbi } from "@/abi/ProfileRegistry";

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`;

// BiomapperLog (Testnet-5) — allow env override, else fall back to official addr
const BIOMAPPER_LOG =
    ((process.env.NEXT_PUBLIC_BIOMAPPER_LOG as `0x${string}`) ||
        "0x3f2B3E471b207475519989369d5E4F2cAbd0A39F") as `0x${string}`;

// Minimal ABI for reads we need
const BiomapperLogAbi = [
    {
        type: "function",
        stateMutability: "view",
        name: "generationsHead",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        type: "function",
        stateMutability: "view",
        name: "generationBiomapping",
        inputs: [
            { name: "who", type: "address" },
            { name: "generationPointer", type: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const;

export default function Home() {
    const { address, isConnected, chainId } = useAccount();
    const [newNick, setNewNick] = useState("");
    const { writeContractAsync, isPending } = useWriteContract();

    const isOnHumanode = isConnected && chainId === humanodeTestnet5.id;
    const canTypeNick = newNick.trim().length > 0;

    // Current nickname (if any)
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
        query: { enabled: Boolean(address) } as any,
    });

    // Read current generation head from BiomapperLog
    const { data: genHead } = useReadContract({
        abi: BiomapperLogAbi,
        address: BIOMAPPER_LOG,
        functionName: "generationsHead",
        chainId: humanodeTestnet5.id,
        query: { enabled: Boolean(isOnHumanode) } as any,
    });

    // Read the user's biomapping pointer in the current generation
    const { data: mappingPtr, isFetching: isFetchingMap } = useReadContract({
        abi: BiomapperLogAbi,
        address: BIOMAPPER_LOG,
        functionName: "generationBiomapping",
        args:
            address && typeof genHead === "bigint"
                ? [address as `0x${string}`, genHead]
                : undefined,
        chainId: humanodeTestnet5.id,
        query: { enabled: Boolean(isOnHumanode && address && typeof genHead === "bigint") } as any,
    });

    const isBiomapped =
        typeof mappingPtr === "bigint" ? mappingPtr > 0n : false;

    const hasNickname =
        typeof nickname === "string" && nickname.length > 0;

    // Button enable logic
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

    // Small dot indicator
    function Dot({ ok }: { ok: boolean }) {
        return (
            <span
                style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: ok ? "#16a34a" /* green-600 */ : "#dc2626" /* red-600 */,
                    marginRight: 8,
                }}
            />
        );
    }

    return (
        <main
            style={{
                padding: 24,
                display: "grid",
                gap: 16,
                maxWidth: 720,
                margin: "0 auto",
            }}
        >
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
                            gap: 8,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Dot ok={isBiomapped} />
                            <strong>
                                Biomapper status:{" "}
                                {isFetchingMap ? "Checking…" : isBiomapped ? "Verified" : "Not biomapped"}
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
                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <input
                                        placeholder="Choose a nickname"
                                        value={newNick}
                                        onChange={(e) => setNewNick(e.target.value)}
                                        style={{
                                            padding: 8,
                                            flex: 1,
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                        }}
                                    />
                                    <button
                                        onClick={onSetNickname}
                                        disabled={!canSubmit}
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            opacity: canSubmit ? 1 : 0.6,
                                            cursor: canSubmit ? "pointer" : "not-allowed",
                                        }}
                                    >
                                        {isPending ? "Setting…" : "Set nickname"}
                                    </button>
                                </div>

                                {!canTypeNick && (
                                    <p style={{ fontSize: 12, opacity: 0.75 }}>
                                        Type a nickname to enable the button.
                                    </p>
                                )}
                            </>
                        ) : (
                            <p>
                                Welcome, <strong>{nickname}</strong>. ✅ Biomapper check passed.
                            </p>
                        )}
                    </section>

                    <section style={{ border: "1px solid #e5e7eb", padding: 16, borderRadius: 12 }}>
                        <h3>Next up</h3>
                        <ul>
                            <li>Contacts list & chat list UI</li>
                            <li>“Start chat” flow by address/nickname</li>
                            <li>Public rooms & private groups</li>
                        </ul>
                    </section>
                </>
            )}
        </main>
    );
}