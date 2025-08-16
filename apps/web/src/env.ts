// apps/web/src/env.ts
/* Centralized, typed access to public & server env vars. */

export const env = {
  // Chain / RPC (public)
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID ?? '',
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL ?? '',
  NEXT_PUBLIC_RPC_WS: process.env.NEXT_PUBLIC_RPC_WS ?? '',
  NEXT_PUBLIC_BLOCK_EXPLORER: process.env.NEXT_PUBLIC_BLOCK_EXPLORER ?? '',

  // Address Router (public) — primary source of truth for on-chain addresses
  NEXT_PUBLIC_ADDRESS_ROUTER: process.env.NEXT_PUBLIC_ADDRESS_ROUTER ?? '',

  // Optional direct override (public). If set, this wins over router.
  NEXT_PUBLIC_PROFILE_REGISTRY: process.env.NEXT_PUBLIC_PROFILE_REGISTRY ?? '',

  // Biomapper (public)
  NEXT_PUBLIC_BIOMAPPER_URL: process.env.NEXT_PUBLIC_BIOMAPPER_URL ?? '',
  NEXT_PUBLIC_BIOMAPPER_ADDRESS: process.env.NEXT_PUBLIC_BIOMAPPER_ADDRESS ?? '',
  NEXT_PUBLIC_BIOMAPPER_PROXY: process.env.NEXT_PUBLIC_BIOMAPPER_PROXY ?? '',
  NEXT_PUBLIC_BIOMAPPER_LOG_ADDRESS: process.env.NEXT_PUBLIC_BIOMAPPER_LOG_ADDRESS ?? '',

  // WalletConnect (public)
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',

  // Supabase (public + server)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE, // server-only

  // Feature flags (public)
  NEXT_PUBLIC_REQUIRE_BIOMAPPED:
    (process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED ?? '').toLowerCase() === 'true',

  // Local/dev helpers
  MOCK_SUPABASE: (process.env.MOCK_SUPABASE ?? '').toLowerCase() === 'true',
} as const;

export type Env = typeof env;
