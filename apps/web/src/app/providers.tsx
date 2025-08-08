"use client";
import "@rainbow-me/rainbowkit/styles.css";
import { useEffect, useState } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { humanodeTestnet5 } from "@/lib/humanode";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    // Ensure NOTHING from WalletConnect runs during SSR
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null; // avoid hydration mismatch & indexedDB on server

    const projectId =
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

    // Build config *after* mount (client-only)
    const config = getDefaultConfig({
        appName: "Humanode Chat",
        projectId,
        chains: [humanodeTestnet5],
        transports: {
            [humanodeTestnet5.id]: http(humanodeTestnet5.rpcUrls.default.http[0]),
        },
        ssr: false, // ensure wagmi/rainbowkit don’t try SSR
    });

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>{children}</RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}