"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export default function Home() {
    const { address, isConnected } = useAccount();

    return (
        <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>🚀 Humanode Chat Prototype</h1>
            <ConnectButton />
            {isConnected && (
                <div style={{ marginTop: "1rem" }}>
                    <p>Connected as: {address}</p>
                    <p>✅ Wallet connected. Biomapper check coming next.</p>
                </div>
            )}
        </main>
    );
}
