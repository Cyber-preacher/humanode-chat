import ContactsList from '@/components/ContactsList';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ContactsPage({
  searchParams,
}: {
  // Next 15 typedRoutes: searchParams is a Promise
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const owner =
    typeof sp.owner === 'string' ? sp.owner : Array.isArray(sp.owner) ? sp.owner[0] ?? '' : '';

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Contacts</h1>
      <ContactsList ownerAddress={owner} />
      {!owner && (
        <p className="text-sm text-neutral-500">
          Tip: for now, pass <code>?owner=0x…</code> in the URL to load your contacts.
        </p>
      )}
    </main>
  );
}
