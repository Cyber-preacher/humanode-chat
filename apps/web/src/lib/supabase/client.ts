<<<<<<< HEAD
﻿// apps/web/src/lib/supabase/client.ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getClientEnv } from '@/env';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const {
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  } = getClientEnv();

  browserClient = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } }
  );

  return browserClient;
}

const supabase = getSupabaseBrowser();
export default supabase;
=======
'use client';

import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

/**
 * Browser Supabase client using validated public env.
 * We keep both a named and default export, plus a
 * compatibility helper `getSupabaseBrowser()` so old
 * imports keep working.
 */
export const supabaseClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: { persistSession: false },
    }
);

/** Back-compat with older imports in components */
export const getSupabaseBrowser = () => supabaseClient;

export default supabaseClient;
>>>>>>> 28e73a6 (Refactor: bundle all refactoring PRs (#28))
