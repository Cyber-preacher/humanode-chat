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

let __chats: Chat[] = [];
let __messages: Message[] = [];

// ---------- Helpers used by tests ----------
function __reset() {
  __chats = [{ id: "c_lobby", slug: "lobby" }];
  __messages = [];
}

function __setChats(chats: Array<Partial<Chat> & Pick<Chat, "id" | "slug">>) {
  __chats = chats.map((c) => ({ id: c.id, slug: c.slug }));
}

function __setMessages(
  msgs: Array<
    Partial<Message> &
      Pick<Message, "id" | "chat_id" | "sender_address" | "body">
  >
) {
  const now = Date.now();
  __messages = msgs.map((m, i) => ({
    id: m.id,
    chat_id: m.chat_id,
    sender_address: String(m.sender_address).toLowerCase(),
    body: m.body,
    created_at:
      m.created_at ??
      new Date(now - (msgs.length - i) * 1000).toISOString(),
  }));
}

// Back-compat for lobby tests that seed “lobby” implicitly
function __setLobbyMessages(
  msgs: Array<
    Partial<Message> & Pick<Message, "id" | "sender_address" | "body">
  >
) {
  const lobby =
    __chats.find((c) => c.slug === "lobby") ?? { id: "c_lobby", slug: "lobby" };
  if (!__chats.find((c) => c.id === lobby.id)) __chats.push(lobby);

  const now = Date.now();
  __messages = msgs.map((m, i) => ({
    id: m.id,
    chat_id: m.chat_id ?? lobby.id,
    sender_address: String(m.sender_address).toLowerCase(),
    body: m.body,
    created_at:
      m.created_at ??
      new Date(now - (msgs.length - i) * 1000).toISOString(),
  }));
}

// exact name used in older tests:
const __seedLobbyMessages = __setLobbyMessages;

// ---------- Minimal Supabase query builder mock ----------
type Filter = {
  table: "chats" | "messages";
  selectCols?: string;
  countHead?: boolean;
  filters: Record<string, any>;
  gtFilters: Record<string, any>;
  orderBy?: { column: string; ascending: boolean };
  limitN?: number;
  insertPayload?: any;
  lastInsert?: any;
};

function makeBuilder(table: "chats" | "messages") {
  const f: Filter = {
    table,
    filters: {},
    gtFilters: {},
  };

  const api: any = {
    // SELECT
    select(cols?: string, options?: { count?: "exact"; head?: boolean }) {
      f.selectCols = cols;
      if (options?.head) f.countHead = true;
      return api;
    },

    // INSERT (for messages)
    insert(payload: any) {
      const row = Array.isArray(payload) ? payload[0] : payload;
      const nowIso = new Date().toISOString();
      const toInsert =
        table === "messages"
          ? ({
              id: row.id ?? `m_${Math.random().toString(36).slice(2, 8)}`,
              chat_id: row.chat_id,
              sender_address: String(
                row.sender_address ?? row.senderAddress ?? ""
              ).toLowerCase(),
              body: row.body,
              created_at: nowIso,
            } as Message)
          : row;

      if (table === "messages") {
        __messages.push(toInsert);
      }
      f.lastInsert = toInsert;

      return {
        select() {
          return this;
        },
        single() {
          return Promise.resolve({ data: f.lastInsert, error: null });
        },
      };
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
      if (rows.length === 0) return { data: null, error: new Error("No rows") };
      return { data: null, error: new Error("More than one row") };
    },

    async _exec(): Promise<{ data: any; error: any; count?: number | null }> {
      if (f.table === "chats") {
        let rows = __chats.slice();
        Object.entries(f.filters).forEach(([k, v]) => {
          rows = rows.filter((r: any) => String(r[k]) === String(v));
        });

        if (f.countHead) {
          return { data: null, error: null, count: rows.length };
        }

        if (typeof f.limitN === "number") rows = rows.slice(0, f.limitN);
        return { data: rows, error: null };
      }

      // messages
      let rows = __messages.slice();

      Object.entries(f.filters).forEach(([k, v]) => {
        rows = rows.filter((r: any) => String(r[k]) === String(v));
      });

      Object.entries(f.gtFilters).forEach(([k, v]) => {
        if (k === "created_at") {
          const since = new Date(String(v)).getTime();
          rows = rows.filter(
            (r: any) => new Date(r.created_at).getTime() > since
          );
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

      if (typeof f.limitN === "number") rows = rows.slice(0, f.limitN);

      if (f.countHead) {
        return { data: null, error: null, count: rows.length };
        // note: supabase returns data: [] with head:true, but count is what matters
      }

      return { data: rows, error: null };
    },
  };

  // Make the builder awaitable like Supabase’s PostgrestFilterBuilder
  api.then = (resolve: any, reject?: any) =>
    api
      ._exec()
      .then(resolve, reject);

  return api;
}

// ---------- Supabase factory used by route code ----------
function getSupabaseAdmin() {
  return {
    from(table: "chats" | "messages") {
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
  __seedLobbyMessages,
};
