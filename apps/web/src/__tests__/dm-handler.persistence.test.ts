// apps/web/src/__tests__/dm-handler.persistence.test.ts
import * as DM from '@/lib/dm/handler';

const handleDmPost = (DM as any).handleDmPost as (
  args: Parameters<typeof DM.handleDmPost>[0],
) => ReturnType<typeof DM.handleDmPost>;

// Minimal inline Supabase-like mock (snake_case)
type Row = Record<string, any>;

function makeSupabaseMock() {
  const db = { chats: [] as Row[], chat_members: [] as Row[] };

  function pickCols(rows: Row[], cols?: string | null) {
    if (!cols || cols === '*') return rows;
    const picks = cols.split(',').map((s) => s.trim());
    return rows.map((r) => Object.fromEntries(picks.map((k) => [k, r[k]])));
  }

  function table(name: 'chats' | 'chat_members') {
    const rows = db[name];
    return {
      select(cols?: string) {
        const ctx = { cols: cols ?? '*', filters: [] as ((r: Row) => boolean)[] };
        const api = {
          eq(col: string, val: any) {
            ctx.filters.push((r: Row) => r[col] === val);
            return api;
          },
          order() {
            return api;
          },
          async limit(n: number) {
            let res = rows;
            for (const f of ctx.filters) res = res.filter(f);
            return { data: pickCols(res.slice(0, Math.max(0, n)), ctx.cols), error: null };
          },
        };
        return api;
      },
      insert(payload: Row | Row[]) {
        const list = Array.isArray(payload) ? payload : [payload];
        if (name === 'chats') {
          for (const r of list) {
            if (rows.some((x) => x.slug === r.slug)) continue;
            rows.push({
              id: randomId(),
              type: r.type ?? 'dm',
              slug: r.slug,
              created_at: new Date().toISOString(),
            });
          }
        } else {
          for (const r of list) {
            const addr = (r.address as string).toLowerCase();
            const exists = rows.find((x) => x.chat_id === r.chat_id && x.address === addr);
            if (!exists) {
              rows.push({
                chat_id: r.chat_id,
                address: addr,
                added_at: new Date().toISOString(),
              });
            }
          }
        }
        const inserted = list.map((r) => {
          if (name === 'chats') return rows.find((x) => x.slug === r.slug)!;
          const addr = (r.address as string).toLowerCase();
          return rows.find((x) => x.chat_id === r.chat_id && x.address === addr)!;
        });
        return {
          select(cols?: string) {
            const c = cols ?? '*';
            return {
              async limit(n: number) {
                return { data: pickCols(inserted.slice(0, Math.max(0, n)), c), error: null };
              },
            };
          },
        };
      },
    };
  }

  function randomId() {
    const s = Math.random().toString(16).slice(2).padEnd(32, '0');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(
      20,
    )}`;
  }

  return {
    from(tbl: string) {
      if (tbl !== 'chats' && tbl !== 'chat_members') throw new Error(`unknown table ${tbl}`);
      return table(tbl as 'chats' | 'chat_members');
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
    expect(r1.payload.ok).toBe(true);
    const chatId = r1.payload.chatId;
    expect(chatId).toBeTruthy();

    const r2 = await handleDmPost({
      ownerHeader: owner,
      body: { peerAddress: peer },
      supabase,
    });
    expect(r2.status).toBe(200);
    expect(r2.payload.ok).toBe(true);
    expect(r2.payload.chatId).toBe(chatId);
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
