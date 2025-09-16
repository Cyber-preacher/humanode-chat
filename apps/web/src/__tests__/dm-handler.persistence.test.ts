// apps/web/src/__tests__/dm-handler.persistence.test.ts
import { handleDmPost, type ChatMemberRow, type ChatRow, type DataResult } from '@/lib/dm/handler';

// Minimal inline Supabase-like mock (snake_case, no `any`)
type RowMap = {
  chats: ChatRow[];
  chat_members: ChatMemberRow[];
};

function pickCols<T extends Record<string, unknown>>(rows: T[], cols?: string | null): T[] {
  if (!cols || cols === '*') return rows;
  const picks = cols.split(',').map((s) => s.trim());
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const k of picks) out[k] = r[k as keyof T];
    return out as T;
  });
}

function randomId(): string {
  const s = Math.random().toString(16).slice(2).padEnd(32, '0');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function makeSupabaseMock() {
  const db: RowMap = { chats: [], chat_members: [] };

  function table(name: 'chats' | 'chat_members') {
    const rows = db[name];

    return {
      select(cols?: string) {
        const ctx = {
          cols: cols ?? '*',
          filters: [] as Array<(r: ChatRow | ChatMemberRow) => boolean>,
        };
        const api = {
          eq(col: string, val: unknown) {
            ctx.filters.push(
              (r: ChatRow | ChatMemberRow) => (r as Record<string, unknown>)[col] === val,
            );
            return api;
          },
          order() {
            return api;
          },
          async limit(n: number): Promise<DataResult<ChatRow | ChatMemberRow>> {
            let res = rows as Array<ChatRow | ChatMemberRow>;
            for (const f of ctx.filters) res = res.filter(f);
            const data = pickCols(
              res.slice(0, Math.max(0, n)) as Array<Record<string, unknown>>,
              ctx.cols,
            ) as Array<ChatRow | ChatMemberRow>;
            return { data, error: null };
          },
        };
        return api;
      },

      insert(
        payload:
          | Partial<ChatRow>
          | Partial<ChatMemberRow>
          | Array<Partial<ChatRow> | Partial<ChatMemberRow>>,
      ) {
        const list = Array.isArray(payload) ? payload : [payload];

        if (name === 'chats') {
          for (const r of list as Array<Partial<ChatRow>>) {
            if ((rows as ChatRow[]).some((x) => x.slug === r.slug)) continue; // unique(slug)
            (rows as ChatRow[]).push({
              id: randomId(),
              type: r.type ?? 'dm',
              slug: r.slug as string,
              created_at: new Date().toISOString(),
            });
          }
        } else {
          for (const r of list as Array<Partial<ChatMemberRow>>) {
            const addr = String(r.address ?? '').toLowerCase();
            const exists = (rows as ChatMemberRow[]).find(
              (x) => x.chat_id === (r.chat_id as string) && x.address === addr,
            );
            if (!exists) {
              (rows as ChatMemberRow[]).push({
                chat_id: r.chat_id as string,
                address: addr,
                added_at: new Date().toISOString(),
              });
            }
          }
        }

        const inserted =
          name === 'chats'
            ? (rows as ChatRow[]).filter((x) =>
                (list as Array<Partial<ChatRow>>).some((y) => y.slug === x.slug),
              )
            : (rows as ChatMemberRow[]).filter((x) =>
                (list as Array<Partial<ChatMemberRow>>).some(
                  (y) =>
                    y.chat_id === x.chat_id && String(y.address ?? '').toLowerCase() === x.address,
                ),
              );

        return {
          select(cols?: string) {
            const c = cols ?? '*';
            return {
              async limit(n: number): Promise<DataResult<ChatRow | ChatMemberRow>> {
                const data = pickCols(
                  inserted.slice(0, Math.max(0, n)) as Array<Record<string, unknown>>,
                  c,
                ) as Array<ChatRow | ChatMemberRow>;
                return { data, error: null };
              },
            };
          },
        };
      },
    };
  }

  return {
    from(tbl: 'chats' | 'chat_members') {
      return table(tbl);
    },
    _db: db,
  };
}

describe('handleDmPost (pure handler)', () => {
  const owner = '0x0000000000000000000000000000000000000001';
  const peer = '0x00000000000000000000000000000000000000A2';

  it('creates DM on first call and reuses on second', async () => {
    const supabase = makeSupabaseMock();

    const r1 = await handleDmPost({
      ownerHeader: owner,
      body: { peerAddress: peer },
      supabase,
    });
    expect(r1.status).toBe(201);
    expect((r1.payload as Record<string, unknown>).ok).toBe(true);
    const chatId = (r1.payload as Record<string, unknown>).chatId as string;
    expect(chatId).toBeTruthy();

    const r2 = await handleDmPost({
      ownerHeader: owner,
      body: { peerAddress: peer },
      supabase,
    });
    expect(r2.status).toBe(200);
    expect((r2.payload as Record<string, unknown>).ok).toBe(true);
    expect((r2.payload as Record<string, unknown>).chatId).toBe(chatId);
  });

  it('rejects invalid inputs', async () => {
    const supabase = makeSupabaseMock();

    const r1 = await handleDmPost({
      ownerHeader: '',
      body: { peerAddress: peer },
      supabase,
    });
    expect(r1.status).toBe(400);

    const r2 = await handleDmPost({
      ownerHeader: owner,
      body: { peerAddress: '0xdead' },
      supabase,
    });
    expect(r2.status).toBe(400);

    const r3 = await handleDmPost({
      ownerHeader: owner,
      body: { peerAddress: owner },
      supabase,
    });
    expect(r3.status).toBe(400);
  });
});
