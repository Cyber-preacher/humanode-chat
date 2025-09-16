// apps/web/src/lib/ratelimit/memory.ts
//
// Minimal process-memory rate limiter suitable for server runtimes.
// Keyed by (bucket, key). Implementation can be replaced later with a DB-backed limiter
// without changing callers.

export type RateLimitInput = {
  bucket: string; // logical bucket, e.g. "dm:create"
  key: string; // per-subject key, e.g. owner address
  limit: number; // max number of events in window
  windowMs: number; // rolling window in milliseconds
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms when a slot frees
};

type Stamp = number; // epoch ms

type BucketKey = `${string}:${string}`;

function makeComposite(bucket: string, key: string): BucketKey {
  return `${bucket}:${key}` as const;
}

// Global store (per server process)
const store: Map<BucketKey, Stamp[]> = new Map();

export function touchRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  const since = now - input.windowMs;
  const ck = makeComposite(input.bucket, input.key);

  const arr = store.get(ck) ?? [];
  // keep only stamps in the active window
  const recent = arr.filter((ts) => ts > since);

  // decide allowance
  const allowed = recent.length < input.limit;

  if (allowed) {
    recent.push(now);
    store.set(ck, recent);
  } else {
    // already at limit; keep recent unchanged
    store.set(ck, recent);
  }

  const remaining = Math.max(0, input.limit - recent.length);
  // compute next reset: when the oldest stamp in-window expires
  const nextReset = recent.length > 0 ? recent[0] + input.windowMs : now;

  return {
    allowed,
    remaining,
    resetAt: nextReset,
  };
}

// for tests or admin endpoints if needed
export function clearRateLimit(bucket?: string, key?: string) {
  if (!bucket && !key) {
    store.clear();
    return;
  }
  const ck = makeComposite(bucket ?? '', key ?? '');
  store.delete(ck);
}
