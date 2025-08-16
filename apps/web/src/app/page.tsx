// apps/web/src/app/page.tsx
import NicknameForm from '@/components/NicknameForm';

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Humanode Chat</h1>
      <NicknameForm />
    </main>
  );
}
