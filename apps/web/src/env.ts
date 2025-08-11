// apps/web/src/env.ts
import { z } from 'zod';

/**
 * Public (client) env must be prefixed with NEXT_PUBLIC_.
 * These are readable in the browser, so only non-secrets go here.
 */
const ClientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/**
 * Server-only env (secrets).
 * Do NOT expose these to the client.
 */
const ServerSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/**
 * We keep parsing lazy—only when a caller asks—so CI/build
 * won’t explode unless the code path actually needs these vars.
 */
export function getClientEnv() {
  return ClientSchema.parse(process.env);
}

export function getServerEnv() {
  return ServerSchema.parse(process.env);
}
