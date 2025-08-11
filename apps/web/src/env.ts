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
