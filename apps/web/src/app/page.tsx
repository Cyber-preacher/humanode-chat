
import Link from 'next/link';

import NicknameForm from '@/components/NicknameForm';

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Humanode Chat</h1>
      <p style={{ opacity: 0.8 }}>
        Welcome. Set your nickname, then jump to the Lobby or your chats.
      </p>

      <section style={{ margin: '1rem 0 2rem' }}>
        <nav style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/lobby">➡️ Lobby</Link>
          <Link href="/contacts">👥 Contacts</Link>
        </nav>
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Set Nickname</h2>
        <NicknameForm />
      </section>

    </main>
  );
}
