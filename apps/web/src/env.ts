<<<<<<< HEAD
import { z } from 'zod';

/** Public (browser) env */
const ClientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(16),
});

/** Server-only env (optional) */
const ServerSchema = z.object({
  SUPABASE_SERVICE_ROLE: z.string().trim().min(16).optional(),
});

const clientParse = ClientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
if (!clientParse.success) {
  const issues = clientParse.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`[env] Invalid NEXT_PUBLIC_* env: ${issues}`);
}

const serverParse = ServerSchema.safeParse({
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
});

export const env = {
  ...clientParse.data,
  ...(serverParse.success ? serverParse.data : {}),
};

export type ClientEnv = z.infer<typeof ClientSchema>;
export function getClientEnv(): ClientEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
=======
// apps/web/src/env.ts
import { z } from 'zod';

/**
 * Client-safe env (NEXT_PUBLIC_* only).
 * This gets bundled in the browser, so never put secrets here.
 */
const ClientEnvSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const clientParse = ClientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!clientParse.success) {
    const issues = clientParse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`[env] Invalid NEXT_PUBLIC_* env: ${issues}`);
}

/**
 * Exported as `env` for convenience (current usage),
 * and `clientEnv` if you want the explicit name.
 */
export const env = clientParse.data;
export const clientEnv = clientParse.data;
export type ClientEnv = z.infer<typeof ClientEnvSchema>;

/**
 * Optionally, if you want server-only validation too,
 * you can add secrets here and import where needed.
 * (Not strictly required for this warning fix.)
 */
// const ServerEnvSchema = z.object({
//   SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
// });
// export const serverEnv = ServerEnvSchema.parse({
//   SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
// });
>>>>>>> 28e73a6 (Refactor: bundle all refactoring PRs (#28))
