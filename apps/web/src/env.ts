// apps/web/src/env.ts
import { z } from 'zod';

/** Public (browser) env */
const ClientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(16),
  // Optional but nice to validate if present
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().trim().min(1).optional(),
});

/** Server-only env (optional for now) */
const ServerSchema = z.object({
  SUPABASE_SERVICE_ROLE: z.string().trim().min(16).optional(),
});

const clientParse = ClientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
});

if (!clientParse.success) {
  const issues = clientParse.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
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

/** Legacy helper for callers that expect a getter */
export function getClientEnv(): ClientEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  };
}
