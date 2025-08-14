export type Contact = { address: string; alias: string | null; created_at?: string };

type ListContactsOk = { ok: true; contacts: Contact[] };
type OkOnly = { ok: true };

function hasError(x: unknown): x is { error: string } {
  if (typeof x !== 'object' || x === null) return false;
  const rec = x as Record<string, unknown>;
  return typeof rec.error === 'string';
}

export async function listContacts(ownerAddress: string): Promise<ListContactsOk> {
  const qs = new URLSearchParams({ ownerAddress });
  const res = await fetch(`/api/contacts?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    throw new Error(hasError(data) ? data.error : String(res.statusText));
  }
  const json: unknown = await res.json();
  // trusting our API shape; narrow to ListContactsOk
  return json as ListContactsOk;
}

export async function addContact(
  ownerAddress: string,
  contactAddress: string,
  alias?: string
): Promise<OkOnly> {
  const res = await fetch(`/api/contacts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ownerAddress, contactAddress, alias }),
  });

  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    throw new Error(hasError(data) ? data.error : String(res.statusText));
  }
  const json: unknown = await res.json().catch(() => ({ ok: true }));
  return json as OkOnly;
}

export async function deleteContact(ownerAddress: string, address: string): Promise<void> {
  const qs = new URLSearchParams({ ownerAddress });
  const res = await fetch(`/api/contacts/${address}?${qs.toString()}`, { method: 'DELETE' });

  if (!res.ok && res.status !== 204) {
    const data: unknown = await res.json().catch(() => null);
    throw new Error(hasError(data) ? data.error : String(res.statusText));
  }
}
