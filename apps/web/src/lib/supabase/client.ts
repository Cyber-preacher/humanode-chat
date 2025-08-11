'use client';

import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

// Browser Supabase client using validated public env
export const supabaseClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: { persistSession: false },
    }
);

export default supabaseClient;
