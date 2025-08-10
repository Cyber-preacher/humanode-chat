// apps/web/src/__mocks__/supabaseServer.mock.ts

type Message = {
  id: string;
  chat_id: string;
  sender_address: string;
  body: string;
  created_at: string;
};

const state = {
  lobbyId: "lobby-uuid",
  messages: [] as Message[],
};

export function __reset() {
  state.messages = [];
}

export function __setLobbyMessages(msgs: Message[]) {
  state.messages = [...msgs];
}

function ok<T>(data: T) {
  return { data, error: null as any };
}
function err(message: string) {
  return { data: null, error: new Error(message) };
}

class QueryBuilder {
  private table: string;
  private cols: string | null = null;
  private filters: Record<string, any> = {};
  private _order: { column: string; ascending: boolean } | null = null;
  private _limit: number | null = null;
  private _payload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string) {
    this.cols = cols;
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  order(column: string, opts: { ascending: boolean }) {
    this._order = { column, ascending: opts.ascending };
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  single() {
    if (this.table === "chats") {
      if (this.filters["slug"] === "lobby") {
        return ok({ id: state.lobbyId });
      }
      return err("Lobby not found");
    }
    if (this.table === "messages" && this._payload) {
      const row: Message = {
        id: `id-${Date.now()}`,
        chat_id: this._payload.chat_id,
        sender_address: this._payload.sender_address,
        body: this._payload.body,
        created_at: new Date().toISOString(),
      };
      state.messages.push(row);
      return ok(row);
    }
    return err("single() not applicable");
  }

  insert(payload: any) {
    this._payload = payload;
    return this;
  }

  // Select after insert
  select() {
    return this;
  }

  // Regular select query
  async then(resolve: any) {
    // this makes QueryBuilder awaitable if accidentally awaited
    resolve(this);
  }

  // Non-insert fetch
  async fetch() {
    if (this.table === "messages") {
      let list = state.messages.filter(
        (m) => this.filters["chat_id"] ? m.chat_id === this.filters["chat_id"] : true
      );
      if (this._order) {
        list = list.sort((a, b) =>
          this._order!.ascending
            ? a.created_at.localeCompare(b.created_at)
            : b.created_at.localeCompare(a.created_at)
        );
      }
      if (typeof this._limit === "number") list = list.slice(0, this._limit);
      return ok(list);
    }
    return err("fetch not implemented for table: " + this.table);
  }
}

class MockSupa {
  from(table: string) {
    return new QueryBuilder(table);
  }
}

export function getSupabaseAdmin() {
  return new MockSupa() as any;
}
