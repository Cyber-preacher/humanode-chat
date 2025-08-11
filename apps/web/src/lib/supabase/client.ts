// apps/web/src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { getClientEnv } from '@/env';

// The public client for browser use
const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getClientEnv();

export const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
