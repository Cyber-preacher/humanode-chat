// apps/web/src/lib/supabase/client.ts
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
