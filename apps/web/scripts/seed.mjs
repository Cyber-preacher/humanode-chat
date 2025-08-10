import { createClient } from '@supabase/supabase-js';

// Load env from app and repo root
try {
  const { config } = await import('dotenv');
  const { resolve } = await import('node:path');
  const cwd = process.cwd(); // when called via "pnpm --filter web", this is apps/web

  // Browser-safe values (URL, publishable key) usually live here:
  config({ path: resolve(cwd, '.env.local') });

  // Service role is typically at repo root:
  config({ path: resolve(cwd, '../../.env') });
} catch {
  // dotenv optional; if missing, we’ll fail clearly below
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!url || !serviceRole) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

const supa = createClient(url, serviceRole, { auth: { persistSession: false } });

const { error } = await supa
  .from('chats')
  .upsert({ slug: 'lobby', title: 'Lobby', is_public: true }, { onConflict: 'slug' });

if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}

console.log('✅ Seeded/updated lobby');
