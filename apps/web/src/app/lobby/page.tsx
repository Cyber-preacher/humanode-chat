// apps/web/src/app/lobby/page.tsx

import LobbyChat from "@/components/LobbyChat";

export default function LobbyPage() {
  return (
    <main style={{ padding: 24, display: "grid", gap: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1>🏟️ Lobby</h1>
      <p style={{ opacity: 0.8, marginTop: -8 }}>
        Public room backed by Supabase. Wallet required to post.
      </p>
      <LobbyChat />
    </main>
  );
}
