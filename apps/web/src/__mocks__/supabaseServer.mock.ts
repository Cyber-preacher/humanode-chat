/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;

class MockDB {
  tables: Record<string, Row[]> = {
    chats: [{ id: 'lobby-chat-id', slug: 'lobby', title: 'Lobby', is_public: true }],
    messages: [],
  };

  get(name: string): Row[] {
    if (!this.tables[name]) this.tables[name] = [];
    return this.tables[name];
  }

  insert(name: string, row: Row): Row {
    if (name === 'messages') {
      const id = `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const created_at = new Date().toISOString();
      const full = { id, created_at, ...row };
      this.get(name).push(full);
      return full;
    }
    this.get(name).push(row);
    return row;
  }
}

type SelectState = { kind: 'select'; single: boolean };
type InsertState = { kind: 'insert'; rows: Row[] };

class MockQuery {
  private filters: Record<string, any> = {};
  private limitN: number | null = null;
  private orderBy: { col: string; asc: boolean } | null = null;
  private state: SelectState | InsertState = { kind: 'select', single: false };

  constructor(private table: string, private db: MockDB) { }

  // --- SELECT chain ---
  select(_cols?: string) {
    this.state = { kind: 'select', single: false };
    return this;
  }
  eq(col: string, val: any) {
    this.filters[col] = val;
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: !!(opts?.ascending ?? true) };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    if (this.state.kind === 'select') this.state.single = true;
    return this;
  }

  // --- INSERT chain ---
  insert(rows: Row[]) {
    const table = this.table;
    const db = this.db;
    this.state = { kind: 'insert', rows };
    return {
      select() {
        return {
          async single() {
            const inserted = rows.map((r) => db.insert(table, r));
            return { data: inserted[0] ?? null, error: null };
          },
        };
      },
    };
  }

  // Allow `await` on the builder like Supabase does
  then(onFulfilled: (v: any) => void, onRejected?: (r: any) => void) {
    (async () => {
      try {
        const result = await this.execute();
        onFulfilled(result);
      } catch (e) {
        if (onRejected) onRejected(e);
        else throw e;
      }
    })();
  }

  private async execute() {
    if (this.state.kind === 'select') {
      let rows = [...this.db.get(this.table)];

      for (const [k, v] of Object.entries(this.filters)) {
        rows = rows.filter((r) => r[k] === v);
      }

      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        rows.sort((a, b) => {
          const av = a[col];
          const bv = b[col];
          if (av === bv) return 0;
          return (av < bv ? -1 : 1) * (asc ? 1 : -1);
        });
      }

      if (this.limitN !== null) rows = rows.slice(0, this.limitN);

      if (this.state.single) return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    }

    if (this.state.kind === 'insert') {
      const inserted = this.state.rows.map((r) => this.db.insert(this.table, r));
      return { data: inserted, error: null };
    }

    return { data: null, error: null };
  }
}

export function getSupabaseServer() {
  const db = new MockDB();
  return {
    from(table: string) {
      return new MockQuery(table, db) as any;
    },
  };
}
