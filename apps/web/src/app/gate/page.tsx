// apps/web/src/app/gate/page.tsx
export default function GatePage() {
  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Access requires Biomapper</h1>
      <p className="text-sm text-neutral-500">
        To use Humanode Chat you must verify once with Humanode Biomapper and set a nickname
        on-chain.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li>Connect your wallet.</li>
        <li>Complete Biomapper (private liveness & uniqueness).</li>
        <li>Set your on-chain nickname.</li>
      </ol>
      <p className="text-sm text-neutral-500">
        After you finish, return here and refresh — you’ll be let in automatically.
      </p>
    </main>
  );
}
