// apps/web/src/lib/ratelimit/index.ts
//
// Public facade: tries DB-backed limiter first (if available), otherwise falls back to memory.
// We inline the DB RPC path here to avoid module resolution issues in certain builds.

import {
  touchRateLimit as touchMemory,
  clearRateLimit as clearMemory,
  type RateLimitInput,
} from './memory';

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

export type RateArgs = {
  bucket: RateLimitInput['bucket'];
  key: RateLimitInput['key'];
  limit: RateLimitInput['limit'];
  windowMs: RateLimitInput['windowMs'];
  supabase?: unknown; // optional; when provided and RPC exists, DB path is attempted
};

function isSupabaseRpcLike(v: unknown): v is SupabaseRpcLike {
  return !!v && typeof (v as { rpc?: unknown }).rpc === 'function';
}

async function touchRateLimitDb(args: {
  bucket: string;
  key: string;
  windowMs: number;
  limit: number;
  supabase: unknown;
}): Promise<RateResult | null> {
  try {
    if (!isSupabaseRpcLike(args.supabase)) return null;

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

export async function touchRateLimit(args: RateArgs): Promise<RateResult> {
  // Call DB helper with explicit shape so TS sees `supabase` as present
  const dbRes = await touchRateLimitDb({
    bucket: args.bucket,
    key: args.key,
    windowMs: args.windowMs,
    limit: args.limit,
    supabase: args.supabase as unknown,
  });
  if (dbRes) return dbRes;

  // Fallback for tests/local (or if DB path not available)
  const mem = touchMemory({
    bucket: args.bucket,
    key: args.key,
    limit: args.limit,
    windowMs: args.windowMs,
  });
  return {
    allowed: mem.allowed,
    remaining: mem.remaining,
    retryAfterMs: mem.allowed ? undefined : Math.max(0, mem.resetAt - Date.now()),
  };
}

export function clearRateLimit(): void {
  clearMemory();
}
