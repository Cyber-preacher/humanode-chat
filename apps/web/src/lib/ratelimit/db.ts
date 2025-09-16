// apps/web/src/lib/ratelimit/db.ts
//
// DB-backed rate limit helper (Supabase RPC).
// Calls a Postgres function `ratelimit_touch(bucket, key, window_ms, limit, now)`
// returning { allowed boolean, remaining int, retry_after_ms int|null }.

export type RateResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
};

export interface SupabaseRpcLike {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

export async function touchRateLimitDb(args: {
  bucket: string;
  key: string;
  windowMs: number;
  limit: number;
  supabase: SupabaseRpcLike;
}): Promise<RateResult | null> {
  try {
    const { supabase, bucket, key, windowMs, limit } = args;
    const nowSec = Math.floor(Date.now() / 1000);

    const { data, error } = await supabase.rpc('ratelimit_touch', {
      p_bucket: bucket,
      p_key: key,
      p_window_ms: windowMs,
      p_limit: limit,
      p_now: nowSec,
    });

    if (error || !data) return null;

    const row = data as Partial<{
      allowed: boolean;
      remaining: number;
      retry_after_ms: number | null;
    }>;

    if (typeof row.allowed !== 'boolean' || typeof row.remaining !== 'number') return null;

    return {
      allowed: row.allowed,
      remaining: row.remaining,
      retryAfterMs: typeof row.retry_after_ms === 'number' ? row.retry_after_ms : undefined,
    };
  } catch {
    return null;
  }
}
