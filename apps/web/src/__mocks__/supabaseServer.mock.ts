/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * apps/web/src/__mocks__/supabaseServer.mock.ts
 * In-memory Supabase admin mock for tests (singleton).
 * - Column aliasing: snake_case ⇄ camelCase across filters/order/select.
 * - Filters: eq, gte, lte, gt, lt
 * - Tables: contacts, lobby_messages, chats, chat_messages, **messages (union view)**
 * - select (head+count), insert, update, delete, order, limit
 * - single(), maybeSingle()
 * - Test helpers: __reset, __setContacts, __setChats, __setMessages, __seedLobbyMessages
 */

type ContactRow = {
  id: string;
  owner_address: string;
  contact_address: string;
  label: string | null;
  created_at: string;
};

type LobbyMsg = {
  id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

type Chat = { id: string; slug: string };
type ChatMsg = {
  id: string;
  chat_id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

type DBShape = {
  contacts: ContactRow[];
  lobby_messages: LobbyMsg[];
  chats: Chat[];
  chat_messages: ChatMsg[];
};

const G: any = globalThis as any;
if (!G.__SB_DB__) {
  G.__SB_DB__ = { contacts: [], lobby_messages: [], chats: [], chat_messages: [] } as DBShape;
  G.__SB_SEQ__ = 1;
  G.__SB_NOW__ = Date.now();
}
const db: DBShape = G.__SB_DB__;
function nextId() {
  return String(G.__SB_SEQ__++);
}
function nextIso() {
  return new Date(G.__SB_NOW__++).toISOString();
}

const asArray = (x: any): any[] => (Array.isArray(x) ? x : []);
const toSnake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const getVal = (row: any, col: string) => {
  if (col in row && row[col] !== undefined) return row[col];
  const snake = toSnake(col);
  if (snake in row && row[snake] !== undefined) return row[snake];
  const camel = toCamel(col);
  if (camel in row && row[camel] !== undefined) return row[camel];
  return undefined;
};

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

type Filter = { kind: 'eq' | 'gte' | 'lte' | 'gt' | 'lt'; column: string; value: any };
type Order = { column: string; ascending: boolean };

function cmp(a: any, b: any): number {
  if (typeof a === 'string' && typeof b === 'string') return a === b ? 0 : a < b ? -1 : 1;
  const na = Number(a),
    nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb ? 0 : na < nb ? -1 : 1;
  return String(a) === String(b) ? 0 : String(a) < String(b) ? -1 : 1;
}
function passFilter(row: any, f: Filter): boolean {
  const v = getVal(row, f.column);
  switch (f.kind) {
    case 'eq':
      return String(v) === String(f.value);
    case 'gte':
      return cmp(v, f.value) >= 0;
    case 'lte':
      return cmp(v, f.value) <= 0;
    case 'gt':
      return cmp(v, f.value) > 0;
    case 'lt':
      return cmp(v, f.value) < 0;
  }
}
function applyFilters<T extends Record<string, any>>(rows: T[], filters: Filter[]): T[] {
  const arr = asArray(rows);
  return filters.length ? arr.filter((r) => filters.every((f) => passFilter(r, f))) : arr;
}
function applyOrder<T extends Record<string, any>>(rows: T[], order?: Order): T[] {
  const arr = asArray(rows);
  if (!order) return arr;
  const list = [...arr].sort((a, b) => {
    const av = getVal(a, order.column),
      bv = getVal(b, order.column);
    const c = cmp(av, bv);
    if (c !== 0) return c;
    return String(getVal(a, 'id')).localeCompare(String(getVal(b, 'id')));
  });
  return order.ascending ? list : list.reverse();
}
function applyLimit<T>(rows: T[], n?: number): T[] {
  const arr = asArray(rows);
  if (!n || n < 1) return arr;
  return arr.slice(0, n);
}

type TableName = 'contacts' | 'lobby_messages' | 'chats' | 'chat_messages' | 'messages';
function tableRows(name: TableName): any[] {
  switch (name) {
    case 'contacts':
      return db.contacts;
    case 'lobby_messages':
      return db.lobby_messages;
    case 'chats':
      return db.chats;
    case 'chat_messages':
      return db.chat_messages;
    case 'messages':
      return [...db.lobby_messages, ...db.chat_messages]; // union view
  }
}

function makeBuilder(table: TableName) {
  const filters: Filter[] = [];
  let order: Order | undefined;
  let limitN: number | undefined;
  let op: 'select' | 'insert' | 'update' | 'delete' | null = null;
  let selectCols = '*';
  let selectOpts: { head?: boolean; count?: 'exact' | 'planned' | 'estimated' } | undefined;
  let toInsert: any[] | undefined;
  let toUpdate: Record<string, any> | undefined;
  let wantSingle = false;

  const api: any = {
    select(
      cols: string = '*',
      opts?: { head?: boolean; count?: 'exact' | 'planned' | 'estimated' },
    ) {
      op = 'select';
      selectCols = cols;
      selectOpts = opts;
      return api;
    },
    insert(rows: any[]) {
      op = 'insert';
      toInsert = rows;
      return api;
    },
    update(values: Record<string, any>) {
      op = 'update';
      toUpdate = values;
      return api;
    },
    delete() {
      op = 'delete';
      return api;
    },
    eq(column: string, value: any) {
      filters.push({ kind: 'eq', column, value });
      return api;
    },
    gte(column: string, value: any) {
      filters.push({ kind: 'gte', column, value });
      return api;
    },
    lte(column: string, value: any) {
      filters.push({ kind: 'lte', column, value });
      return api;
    },
    gt(column: string, value: any) {
      filters.push({ kind: 'gt', column, value });
      return api;
    },
    lt(column: string, value: any) {
      filters.push({ kind: 'lt', column, value });
      return api;
    },
    order(column: string, opts?: { ascending?: boolean }) {
      order = { column, ascending: !!opts?.ascending };
      return api;
    },
    limit(n: number) {
      limitN = n;
      return api;
    },
    single() {
      wantSingle = true;
      return api;
    },
    maybeSingle() {
      wantSingle = true;
      return api;
    },

    then(resolve: any, reject: any) {
      try {
        return Promise.resolve(execute()).then(resolve, reject);
      } catch (e) {
        return Promise.reject(e).then(resolve, reject);
      }
    },
  };

  function execute(): { data: any; error: any; count?: number } {
    const rows = tableRows(table);

    if (op === 'insert') {
      const inserted = (toInsert ?? []).map((r) => {
        const base: any = { id: nextId(), created_at: nextIso() };
        // Decide target table for "messages" inserts
        const target =
          table === 'messages'
            ? getVal(r, 'chat_id')
              ? 'chat_messages'
              : 'lobby_messages'
            : table;

        if (target === 'contacts') {
          return {
            ...base,
            owner_address: String(getVal(r, 'owner_address') ?? ''),
            contact_address: String(getVal(r, 'contact_address') ?? ''),
            label: (getVal(r, 'label') ?? null) as string | null,
          } as ContactRow;
        }
        if (target === 'lobby_messages') {
          return {
            ...base,
            sender_address: String(getVal(r, 'sender_address') ?? ''),
            body: String(getVal(r, 'body') ?? ''),
          } as LobbyMsg;
        }
        if (target === 'chats') {
          return {
            id: String(getVal(r, 'id') ?? nextId()),
            slug: String(getVal(r, 'slug') ?? 'lobby'),
          } as Chat;
        }
        if (target === 'chat_messages') {
          return {
            ...base,
            chat_id: String(getVal(r, 'chat_id') ?? ''),
            sender_address: String(getVal(r, 'sender_address') ?? ''),
            body: String(getVal(r, 'body') ?? ''),
          } as ChatMsg;
        }
        return { ...base, ...r };
      });

      // Push to actual backing table(s)
      if (table === 'messages') {
        for (const one of inserted) {
          if ('chat_id' in one) db.chat_messages.push(one as ChatMsg);
          else db.lobby_messages.push(one as LobbyMsg);
        }
      } else {
        asArray(rows).push(...inserted);
      }

      const data = wantSingle ? clone(inserted[0] ?? null) : clone(inserted);
      return { data, error: null };
    }

    if (op === 'update') {
      const all =
        table === 'messages' ? [...db.lobby_messages, ...db.chat_messages] : asArray(rows);
      const filtered = applyFilters(all, filters);
      function applyUpdateIn(arr: any[]) {
        for (let i = 0; i < arr.length; i++) {
          const r = arr[i];
          if (filtered.includes(r)) arr[i] = { ...r, ...toUpdate };
        }
      }
      if (table === 'messages') {
        applyUpdateIn(db.lobby_messages);
        applyUpdateIn(db.chat_messages);
      } else {
        applyUpdateIn(all);
      }
      return { data: null, error: null };
    }

    if (op === 'delete') {
      const all =
        table === 'messages' ? [...db.lobby_messages, ...db.chat_messages] : asArray(rows);
      const filtered = applyFilters(all, filters);
      function applyDeleteIn(arr: any[]) {
        const keep = arr.filter((r) => !filtered.includes(r));
        arr.splice(0, arr.length, ...keep);
      }
      if (table === 'messages') {
        applyDeleteIn(db.lobby_messages);
        applyDeleteIn(db.chat_messages);
      } else {
        applyDeleteIn(all);
      }
      return { data: null, error: null };
    }

    // default/select
    const all0 = table === 'messages' ? [...db.lobby_messages, ...db.chat_messages] : asArray(rows);
    const filtered = applyFilters(all0, filters);
    const ordered = applyOrder(filtered, order);
    const limited = applyLimit(ordered, limitN);

    if (selectOpts?.head) {
      return { data: null, error: null, count: filtered.length };
    }

    let data: any;
    if (selectCols !== '*') {
      const cols = selectCols
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const projected = limited.map((r: any) => {
        const out: any = {};
        cols.forEach((c) => (out[c] = getVal(r, c)));
        return out;
      });
      data = wantSingle ? clone(projected[0] ?? null) : clone(projected);
    } else {
      data = wantSingle ? clone(limited[0] ?? null) : clone(limited);
    }
    return { data, error: null };
  }

  return api;
}

export function getSupabaseAdmin() {
  return {
    from(table: TableName) {
      return makeBuilder(table);
    },
  };
}

/** ---------- Test helpers ---------- */
export function __reset() {
  db.contacts = [];
  db.lobby_messages = [];
  db.chats = [];
  db.chat_messages = [];
  G.__SB_SEQ__ = 1;
  G.__SB_NOW__ = Date.now();
}
export function __setContacts(
  rows: Array<
    Omit<ContactRow, 'id' | 'created_at'> & Partial<Pick<ContactRow, 'id' | 'created_at'>>
  >,
) {
  db.contacts = rows.map((r, i) => ({
    id: (r as any).id ?? nextId(),
    owner_address: String((r as any).owner_address),
    contact_address: String((r as any).contact_address),
    label: (r as any).label ?? null,
    created_at: (r as any).created_at ?? new Date(G.__SB_NOW__ + i).toISOString(),
  }));
}
export function __setChats(rows: Array<Chat>) {
  db.chats = rows.map((r) => ({ id: String(r.id), slug: String(r.slug) }));
}
export function __setMessages(rows: Array<any>) {
  if (rows.length && ('chat_id' in rows[0] || 'chatId' in rows[0])) {
    db.chat_messages = rows.map((r: any, i: number) => ({
      id: r.id ?? nextId(),
      chat_id: String(getVal(r, 'chat_id')),
      sender_address: String(getVal(r, 'sender_address') ?? ''),
      body: String(getVal(r, 'body') ?? ''),
      created_at: r.created_at ?? new Date(G.__SB_NOW__ + i).toISOString(),
    }));
  } else {
    db.lobby_messages = rows.map((r: any, i: number) => ({
      id: r.id ?? nextId(),
      sender_address: String(getVal(r, 'sender_address') ?? ''),
      body: String(getVal(r, 'body') ?? ''),
      created_at: r.created_at ?? new Date(G.__SB_NOW__ + i).toISOString(),
    }));
  }
}
export const __seedLobbyMessages = __setMessages; // alias
