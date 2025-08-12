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
