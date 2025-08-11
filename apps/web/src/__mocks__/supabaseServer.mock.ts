// A minimal, awaitable Supabase server mock that supports the exact
// query chains used by the lobby route (GET + POST).

export type Message = {
  id: string;
  sender_address: string;
  body: string;
  created_at: string;
  chat_id: string;
};

const state = {
  chatId: "lobby-1",
  messages: [] as Message[],
};

export function __reset() {
  state.chatId = "lobby-1";
  state.messages = [];
}

export function __setLobbyChat(id: string) {
  state.chatId = id;
}

export function __setLobbyMessages(arr: Message[]) {
  state.messages = arr.slice();
}

// The app imports { getSupabaseServer } from '@/lib/supabase/server'
export function getSupabaseServer() {
  return {
    from(table: string) {
      const ctx: any = {
        table,
        _select: null as null | string,
        _filters: [] as Array<{ col: string; val: unknown }>,
        _order: null as null | { col: string; opts?: { ascending?: boolean } },
        _limit: null as null | number,
        _single: false,
        _insert: null as null | Record<string, unknown> | Record<string, unknown>[],
      };

      const api: any = {
        select(cols: string) {
          ctx._select = cols;
          return api;
        },
        eq(col: string, val: unknown) {
          ctx._filters.push({ col, val });
          return api;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          ctx._order = { col, opts };
          return api;
        },
        limit(n: number) {
          ctx._limit = n;
          return api;
        },
        single() {
          ctx._single = true;
          return api;
        },
        insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
          ctx._insert = payload;
          return api;
        },

        // Make the chain awaitable: `await supa.from(...).select(...).eq(...);`
        async then(resolve: (v: any) => void, reject: (e: unknown) => void) {
          try {
            const out = await exec();
            resolve(out);
          } catch (e) {
            reject(e);
          }
        },
      };

      async function exec(): Promise<{ data: any; error: null | Error }> {
        if (ctx.table === "chats") {
          // Only path used: .select("id").eq("slug","lobby").single()
          if (!ctx._single) {
            return { data: [{ id: state.chatId }], error: null };
          }
          return { data: { id: state.chatId }, error: null };
        }

        if (ctx.table === "messages") {
          // Handle INSERT path: .insert({...}).select().single()
          if (ctx._insert) {
            const rows = Array.isArray(ctx._insert) ? ctx._insert : [ctx._insert];
            const inserted = rows.map((r) => ({
              id: `m${Date.now()}${Math.random().toString(16).slice(2)}`,
              created_at: new Date().toISOString(),
              chat_id: state.chatId,
              sender_address: String((r as any).sender_address ?? ""),
              body: String((r as any).body ?? ""),
            })) as Message[];

            state.messages.push(...inserted);

            if (ctx._single) {
              return { data: inserted[0], error: null };
            }
            return { data: inserted, error: null };
          }

          // Handle SELECT path: .select(...).eq("chat_id", chatId).order(...).limit(n)
          let rows = state.messages.slice();

          if (ctx._filters.length) {
            rows = rows.filter((m) =>
              ctx._filters.every((f) => (m as any)[f.col] === f.val)
            );
          }

          if (ctx._order) {
            const asc = ctx._order.opts?.ascending !== false;
            rows.sort((a: any, b: any) => {
              const av = a[ctx._order!.col];
              const bv = b[ctx._order!.col];
              if (av === bv) return 0;
              return av < bv ? (asc ? -1 : 1) : (asc ? 1 : -1);
            });
          }

          if (typeof ctx._limit === "number") {
            rows = rows.slice(0, ctx._limit);
          }

          return { data: rows, error: null };
        }

        return { data: null, error: new Error("unknown table") };
      }

      return api;
    },
  };
}

export default {
  getSupabaseServer,
  __reset,
  __setLobbyChat,
  __setLobbyMessages,
  __state: state,
};
