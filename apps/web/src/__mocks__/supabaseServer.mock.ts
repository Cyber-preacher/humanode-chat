/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal, route-aware Supabase mock for the Lobby API tests.
 * - Supports:
 *   - from('chats').select('id').eq('slug','lobby').single()
 *   - from('messages').select(...).eq().gt().order().limit() -> { data, error }
 *   - from('messages').select('*', { count:'exact', head:true }).eq().gt() -> { count, error }
 *   - from('messages').insert(row).select().single() -> { data, error }
 * - Exposes helpers to seed/reset data for tests.
 */

type Chat = { id: string; slug: string };
type Message = {
  id: string;
  chat_id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

const state = {
  chats: [] as Chat[],
  messages: [] as Message[],
};

function __reset() {
  state.chats = [{ id: "lobby-1", slug: "lobby" }];
  state.messages = [];
}

function __setLobby(chat: Chat) {
  const i = state.chats.findIndex((c) => c.slug === "lobby");
  if (i >= 0) state.chats[i] = chat;
  else state.chats.push(chat);
}

function __setMessages(msgs: Message[]) {
  state.messages = msgs.map((m) => ({ ...m }));
}

function __seedLobbyMessages(msgs: Omit<Message, "chat_id">[]) {
  const lobby = state.chats.find((c) => c.slug === "lobby") ?? { id: "lobby-1", slug: "lobby" };
  __setLobby(lobby);
  state.messages = msgs.map((m, i) => ({
    id: m.id ?? `m${i + 1}`,
    chat_id: lobby.id,
    sender_address: m.sender_address,
    body: m.body,
    created_at: m.created_at,
  }));
}

function nowIso() {
  return new Date().toISOString();
}

function filterMessages(chain: any) {
  let list = state.messages.slice();
  for (const f of chain._filters) {
    if (f.op === "eq") list = list.filter((m: any) => String(m[f.col]) === String(f.val));
    if (f.op === "gt") list = list.filter((m: any) => String(m[f.col]) > String(f.val));
  }
  if (chain._order) {
    const { col, ascending } = chain._order;
    list.sort((a: any, b: any) => {
      if (a[col] < b[col]) return ascending ? -1 : 1;
      if (a[col] > b[col]) return ascending ? 1 : -1;
      return 0;
    });
  }
  if (typeof chain._limit === "number") list = list.slice(0, chain._limit);
  return list;
}

function getSupabaseAdmin() {
  return {
    from(table: "chats" | "messages") {
      const chain: any = {
        _table: table,
        _filters: [] as any[],
        _order: null as null | { col: string; ascending: boolean },
        _limit: undefined as number | undefined,
        _selectCount: false,
        _head: false,
        _columns: null as null | string,

        select(cols: string, opts?: { count?: "exact"; head?: boolean }) {
          this._columns = cols;
          if (opts?.count) this._selectCount = true;
          if (opts?.head) this._head = true;
          return this;
        },
        eq(col: string, val: any) {
          this._filters.push({ op: "eq", col, val });
          return this;
        },
        gt(col: string, val: any) {
          this._filters.push({ op: "gt", col, val });
          return this;
        },
        order(col: string, options?: { ascending?: boolean }) {
          this._order = { col, ascending: options?.ascending !== false };
          return this;
        },
        limit(n: number) {
          this._limit = n;
          return this;
        },
        async single() {
          if (table === "chats") {
            const found = state.chats.find((c) => this._filters.every((f: any) => (c as any)[f.col] === f.val));
            if (!found) return { data: null, error: new Error("Not found") };
            return { data: found, error: null };
          }
          if (table === "messages") {
            const list = filterMessages(this);
            const one = list[0];
            return { data: one ?? null, error: one ? null : new Error("Not found") };
          }
          return { data: null, error: new Error("Unknown table") };
        },
        insert(row: Partial<Message>) {
          const id = row.id ?? `m${state.messages.length + 1}`;
          const created_at = row.created_at ?? nowIso();
          const msg: Message = {
            id: String(id),
            chat_id: String(row.chat_id),
            sender_address: String(row.sender_address),
            body: String(row.body),
            created_at,
          };
          state.messages.push(msg);
          return {
            select: () => ({
              single: async () => ({ data: msg, error: null }),
            }),
          };
        },

        // Make the whole chain awaitable. Awaiting it resolves to the expected shape
        // based on whether we're counting or fetching rows.
        then(resolve: (v: any) => void) {
          if (table === "messages" && this._selectCount && this._head) {
            const list = filterMessages(this);
            resolve({ count: list.length, error: null });
            return;
          }
          if (table === "messages") {
            const list = filterMessages(this);
            resolve({ data: list, error: null });
            return;
          }
          // default no-op
          resolve({ data: null, error: null });
        },
      };

      return chain;
    },
  };
}

export { getSupabaseAdmin, __reset, __setLobby, __setMessages, __seedLobbyMessages, state };
export default { getSupabaseAdmin, __reset, __setLobby, __setMessages, __seedLobbyMessages, state };
