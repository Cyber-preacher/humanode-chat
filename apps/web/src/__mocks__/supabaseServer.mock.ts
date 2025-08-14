/* eslint-disable @typescript-eslint/no-explicit-any */

// In-memory "DB"
type Chat = { id: string; slug: string };
type Message = {
  id: string;
  chat_id: string;
  sender_address: string;
  body: string;
  created_at: string; // ISO
};
type Contact = {
  owner_address: string;
  contact_address: string;
  alias?: string | null;
  created_at: string; // ISO
};

let __chats: Chat[] = [];
let __messages: Message[] = [];
let __contacts: Contact[] = [];

// ---------- Helpers used by tests ----------
function __reset() {
  __chats = [{ id: 'c_lobby', slug: 'lobby' }];
  __messages = [];
  __contacts = [];
}

function __setChats(chats: Array<Partial<Chat> & Pick<Chat, 'id' | 'slug'>>) {
  __chats = chats.map((c) => ({ id: c.id, slug: c.slug }));
}

function __setMessages(
  msgs: Array<Partial<Message> & Pick<Message, 'id' | 'chat_id' | 'sender_address' | 'body'>>
) {
  const now = Date.now();
  __messages = msgs.map((m, i) => ({
    id: m.id ?? `m_${Math.random().toString(36).slice(2, 8)}`,
    chat_id: m.chat_id,
    sender_address: String(m.sender_address).toLowerCase(),
    body: m.body ?? '',
    created_at: m.created_at ?? new Date(now - (msgs.length - i) * 1000).toISOString(),
  }));
}

// Back-compat for lobby tests that seed “lobby” implicitly
function __setLobbyMessages(
  msgs: Array<Partial<Message> & Pick<Message, 'id' | 'sender_address' | 'body'>>
) {
  const lobby = __chats.find((c) => c.slug === 'lobby') ?? { id: 'c_lobby', slug: 'lobby' };
  if (!__chats.find((c) => c.id === lobby.id)) __chats.push(lobby);

  const now = Date.now();
  __messages = msgs.map((m, i) => ({
    id: m.id ?? `m_${Math.random().toString(36).slice(2, 8)}`,
    chat_id: m.chat_id ?? lobby.id,
    sender_address: String(m.sender_address).toLowerCase(),
    body: m.body ?? '',
    created_at: m.created_at ?? new Date(now - (msgs.length - i) * 1000).toISOString(),
  }));
}

function __setContacts(
  rows: Array<{
    owner_address: string;
    contact_address: string;
    alias?: string | null;
    created_at?: string;
  }>
) {
  const now = Date.now();
  __contacts = rows.map((r, i) => ({
    owner_address: r.owner_address.toLowerCase(),
    contact_address: r.contact_address.toLowerCase(),
    alias: r.alias ?? null,
    created_at: r.created_at ?? new Date(now - (rows.length - i) * 1000).toISOString(),
  }));
}

// exact name used in older tests:
const __seedLobbyMessages = __setLobbyMessages;

// ---------- Minimal Supabase query builder mock ----------
type Table = 'chats' | 'messages' | 'contacts';

type Filter = {
  table: Table;
  selectCols?: string;
  countHead?: boolean;
  filters: Record<string, any>;
  gtFilters: Record<string, any>;
  orderBy?: { column: string; ascending: boolean };
  limitN?: number;
  insertPayload?: any;
  lastInsert?: any;
  isDelete?: boolean;
};

function makeBuilder(table: Table) {
  const f: Filter = {
    table,
    filters: {},
    gtFilters: {},
  };

  const api: any = {
    // SELECT
    select(cols?: string, options?: { count?: 'exact'; head?: boolean }) {
      f.selectCols = cols;
      if (options?.head) f.countHead = true;
      return api;
    },

    // INSERT
    insert(payload: any) {
      const row = Array.isArray(payload) ? payload[0] : payload;
      const nowIso = new Date().toISOString();

      if (table === 'messages') {
        const toInsert: Message = {
          id: row.id ?? `m_${Math.random().toString(36).slice(2, 8)}`,
          chat_id: row.chat_id,
          sender_address: String(row.sender_address ?? row.senderAddress ?? '').toLowerCase(),
          body: row.body,
          created_at: nowIso,
        };
        __messages.push(toInsert);
        f.lastInsert = toInsert;
      } else if (table === 'contacts') {
        const toInsert: Contact = {
          owner_address: String(row.owner_address).toLowerCase(),
          contact_address: String(row.contact_address).toLowerCase(),
          alias: row.alias ?? null,
          created_at: nowIso,
        };
        __contacts.push(toInsert);
        f.lastInsert = toInsert;
      } else {
        // chats rarely inserted by tests
        f.lastInsert = row;
      }

      return {
        select() {
          return this;
        },
        single() {
          return Promise.resolve({ data: f.lastInsert, error: null });
        },
      };
    },

    // DELETE
    delete() {
      f.isDelete = true;
      return api;
    },

    // FILTERS
    eq(column: string, value: any) {
      f.filters[column] = value;
      return api;
    },

    gt(column: string, value: any) {
      f.gtFilters[column] = value;
      return api;
    },

    order(column: string, opts: { ascending: boolean }) {
      f.orderBy = { column, ascending: !!opts?.ascending };
      return api;
    },

    limit(n: number) {
      f.limitN = n;
      return api;
    },

    // EXECUTORS
    async single() {
      const res = await api._exec();
      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length === 1) return { data: rows[0], error: null };
      if (rows.length === 0) return { data: null, error: new Error('No rows') };
      return { data: null, error: new Error('More than one row') };
    },

    async _exec(): Promise<{ data: any; error: any; count?: number | null }> {
      const source =
        f.table === 'chats' ? __chats : f.table === 'messages' ? __messages : __contacts;

      // DELETE path
      if (f.isDelete) {
        let rows = source.slice();
        Object.entries(f.filters).forEach(([k, v]) => {
          rows = rows.filter((r: any) => String(r[k]) === String(v));
        });

        const toRemove = new Set(rows.map((r: any) => JSON.stringify(r)));
        if (f.table === 'contacts') {
          __contacts = __contacts.filter((r) => !toRemove.has(JSON.stringify(r)));
        } else if (f.table === 'messages') {
          __messages = __messages.filter((r) => !toRemove.has(JSON.stringify(r)));
        } else {
          // ignore for chats
        }
        return { data: null, error: null };
      }

      // SELECT path
      let rows = source.slice();

      Object.entries(f.filters).forEach(([k, v]) => {
        rows = rows.filter((r: any) => String(r[k]) === String(v));
      });

      Object.entries(f.gtFilters).forEach(([k, v]) => {
        if (k === 'created_at') {
          const since = new Date(String(v)).getTime();
          rows = rows.filter((r: any) => new Date(r.created_at).getTime() > since);
        }
      });

      if (f.orderBy) {
        const { column, ascending } = f.orderBy;
        rows.sort((a: any, b: any) => {
          const av = a[column];
          const bv = b[column];
          if (av === bv) return 0;
          return ascending ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
        });
      }

      if (typeof f.limitN === 'number') rows = rows.slice(0, f.limitN);

      if (f.countHead) {
        return { data: null, error: null, count: rows.length };
      }

      return { data: rows, error: null };
    },
  };

  // Make the builder awaitable like Supabase’s PostgrestFilterBuilder
  api.then = (resolve: any, reject?: any) => api._exec().then(resolve, reject);

  return api;
}

// ---------- Supabase factory used by route code ----------
function getSupabaseAdmin() {
  return {
    from(table: Table) {
      return makeBuilder(table);
    },
  };
}

// Initialize state
__reset();

// ---------- Exports ----------
export {
  getSupabaseAdmin,
  __reset,
  __setChats,
  __setMessages,
  __setLobbyMessages,
  __setContacts,
  __seedLobbyMessages,
};

// Also support CommonJS require() in tests
module.exports = {
  __esModule: true,
  getSupabaseAdmin,
  __reset,
  __setChats,
  __setMessages,
  __setLobbyMessages,
  __setContacts,
  __seedLobbyMessages,
};
