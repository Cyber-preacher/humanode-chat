// apps/web/src/lib/dm/handler.ts

export type DmBody = { peerAddress?: string };

// Minimal EVM address validator (test-safe, no external deps)
function isEvmAddress(addr: unknown): addr is string {
  return typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

export function canonId(a: string, b: string): string {
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  return `dm:${A < B ? A : B}:${A < B ? B : A}`;
}

/** Rows we touch in tests and simple persistence */
export type ChatRow = {
  id: string;
  type: string;
  slug: string;
  created_at?: string;
};

export type ChatMemberRow = {
  chat_id: string;
  address: string;
  added_at?: string;
};

export type DataResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export interface TableSelectApi<T> {
  eq(col: string, val: unknown): TableSelectApi<T>;
  order(col?: string, opts?: { ascending?: boolean }): TableSelectApi<T>;
  limit(n: number): Promise<DataResult<T>>;
}

export interface TableInsertApi<T> {
  select(cols?: string): {
    limit(n: number): Promise<DataResult<T>>;
  };
}

export type SupabaseFrom<T> = {
  select(cols?: string): TableSelectApi<T>;
  insert(payload: Partial<T> | Array<Partial<T>>): TableInsertApi<T>;
};

export interface SupabaseLike {
  from(table: 'chats'): SupabaseFrom<ChatRow>;
  from(table: 'chat_members'): SupabaseFrom<ChatMemberRow>;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function upsertDmChat(
  supabase: SupabaseLike,
  slug: string,
  owner: string,
  peer: string,
): Promise<{ chatId: string; created: boolean }> {
  // 1) find by slug
  const { data: found, error: findErr } = await supabase
    .from('chats')
    .select('id, slug, type')
    .eq('slug', slug)
    .limit(1);
  if (findErr) throw new Error(findErr.message);

  let chatId: string | null = found?.[0]?.id ?? null;
  let created = false;

  // 2) insert if not exists
  if (!chatId) {
    const { data: ins, error: insErr } = await supabase
      .from<never>('chats' as unknown as 'chats') // keep generic site happy; table is fixed
      .insert({ type: 'dm', slug })
      .select('id')
      .limit(1);

    if (insErr) throw new Error(insErr.message);
    chatId = ins?.[0]?.id ?? null;
    if (!chatId) throw new Error('Failed to create DM chat');
    created = true;
  }

  // 3) ensure both members
  const members = [owner.toLowerCase(), peer.toLowerCase()];
  for (const addr of members) {
    const { data: m, error: mErr } = await supabase
      .from('chat_members')
      .select('chat_id, address')
      .eq('chat_id', chatId)
      .eq('address', addr)
      .limit(1);
    if (mErr) throw new Error(mErr.message);

    if (!m?.length) {
      const { error: insMErr } = await supabase
        .from('chat_members')
        .insert({ chat_id: chatId, address: addr })
        .select('chat_id')
        .limit(1);
      if (insMErr) throw new Error(insMErr.message);
    }
  }

  return { chatId: chatId as string, created };
}

/**
 * Pure testable handler.
 * Inputs: headers value (owner), parsed body, and a Supabase-like client.
 * Output: { status, payload } — caller can wrap into NextResponse in route.ts.
 */
export async function handleDmPost(input: {
  ownerHeader?: string | null;
  body?: DmBody | null;
  supabase: SupabaseLike;
}): Promise<{ status: number; payload: unknown }> {
  const owner = (input.ownerHeader ?? '').trim();
  if (!isEvmAddress(owner)) {
    return {
      status: 400,
      payload: { ok: false, error: 'Missing or invalid x-owner-address' },
    };
  }

  const peer = String(input.body?.peerAddress ?? '').trim();
  if (!isEvmAddress(peer)) {
    return {
      status: 400,
      payload: { ok: false, error: 'Invalid Ethereum address: peerAddress' },
    };
  }
  if (owner.toLowerCase() === peer.toLowerCase()) {
    return { status: 400, payload: { ok: false, error: 'Cannot create DM with self' } };
  }

  const id = canonId(owner, peer);

  try {
    const { chatId, created } = await upsertDmChat(input.supabase, id, owner, peer);
    return {
      status: created ? 201 : 200,
      payload: { ok: true, id, chatId, created },
    };
  } catch (e: unknown) {
    return {
      status: 500,
      payload: { ok: false, error: errorMessage(e) },
    };
  }
}

export default handleDmPost;
