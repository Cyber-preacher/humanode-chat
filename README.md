 chore/release-drafter-triggers
[![CI](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/ci.yml/badge.svg)](…)

[![CI](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![CodeQL](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/codeql.yml/badge.svg)](../../actions/workflows/codeql.yml)
[![Release Draft](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/release-drafter.yml/badge.svg)](../../actions/workflows/release-drafter.yml)


## Humanode-chat

Humanode-chat
This project is an attempt to create a biomapper gated chat app.

Public chat + biomapper-gated nicknames on Humanode Testnet-5.
Frontend: Next.js (App Router) + wagmi + RainbowKit.
Contracts: Hardhat + Biomapper libraries.
Storage: Supabase (Postgres + RLS).

CI

## Quick start

Requirements

Node 20.x (LTS)

pnpm 9.x

A funded Humanode testnet wallet (eHMND)

Supabase project (tables & policies) – see below

1) Install
pnpm install
=======
# Humanode Chat

[![CI](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/ci.yml)

Humanode-gated chat prototype:

* **Biomapper** check on Humanode Testnet-5 (only biomapped wallets can set a nickname)
* On-chain **ProfileRegistry** (nickname) & **ChatRegistry** (events/hooks ready)
* **Next.js 15 + wagmi + RainbowKit** front-end
* **Supabase** for lobby messages (public room), RLS-safe
* Address **Router** + auto-sync so you don’t copy/paste contract addresses ever again

> Status: early preview (`v0.1.x`). Contributions welcome!

---

## Quickstart

### Requirements

* Node.js 20.x
* pnpm 9.x
* Metamask (or WalletConnect) on **Humanode Testnet-5** (Chain ID `14853`)
* Supabase project (free tier OK)

### 1) Install

```bash
pnpm i
```

### 2) Environment variables

We use **two env files**:

1. **Root `.env`** (server-only / secrets — never committed)

```
# Humanode RPC + key for deployments
HUMANODE_RPC_URL=...
PRIVATE_KEY=0x...

# Supabase service role (server-only)
SUPABASE_SERVICE_ROLE=sb_secret_...
```

2. **Web app `apps/web/.env.local`** (browser-safe `NEXT_PUBLIC_*`)

```
# WalletConnect / Biomapper
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
HUMANODE_PROJECT_ID=...

# Optional overrides (frontend will usually use Router/addresses.json)
NEXT_PUBLIC_PROFILE_REGISTRY=0x...
NEXT_PUBLIC_CHAT_REGISTRY=0x...
NEXT_PUBLIC_BIOMAPPER_LOG=0x...

# Supabase client (publishable)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> Git ignores both by default. Keep secrets out of commits.

### 3) Contracts & Address Router

Deploy the **AddressRouter** (stores current contract addresses on-chain) and auto-sync addresses into the frontend:

```bash
# Compile
pnpm run compile

# Deploy Router (also writes deployments/humanode-testnet5.json and syncs apps/web/src/addresses/*)
pnpm run deploy:router

# Deploy contracts (ProfileRegistry / ChatRegistry) — these scripts know how to link BiomapperLogLib
pnpm run deploy:profile
pnpm run deploy:chat

# If you re-deploy anything: regenerate address files for the web app
pnpm run sync:addresses
```

What this does:

* Writes canonical addresses to **`deployments/humanode-testnet5.json`**
* Generates frontend address source files in **`apps/web/src/addresses/`** and **`apps/web/src/addresses.json`**
* The web app prefers these files; `NEXT_PUBLIC_*` can still override for testing.

### 4) Supabase

#### 4.1 Create tables

Run this once in Supabase **SQL Editor**:

```sql
create table if not exists public.chats(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique,
  title text not null,
  is_public boolean not null default true
);

create table if not exists public.messages(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_address text not null,
  body text not null
);

-- Seed a "lobby" room
insert into public.chats (slug, title, is_public)
values ('lobby', 'Public Lobby', true)
on conflict (slug) do nothing;
```

#### 4.2 RLS policies (recommended)

Enable RLS on both tables and add policies:

```sql
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Read lobby + messages
create policy "read_public_chats" on public.chats
for select using (is_public = true);

create policy "read_public_messages" on public.messages
for select using (
  exists (select 1 from public.chats c where c.id = messages.chat_id and c.is_public = true)
);

-- Insert messages into public rooms
create policy "write_public_messages" on public.messages
for insert with check (
  exists (select 1 from public.chats c where c.id = chat_id and c.is_public = true)
);
```

> The API route uses the **service role** on the server, but RLS makes the schema safe even if you later do client-side reads.

### 5) Run the app

```bash
pnpm --filter web dev
# http://localhost:3000
```

Try:

* **Connect wallet**, ensure you’re on **Humanode Testnet-5**
* Biomapper status shows **Verified** if your address is biomapped
* Set nickname (on-chain)
* Visit **/lobby** to read/send messages (Supabase)

---

## Project Structure

```
.
├─ contracts/                  # Solidity (ProfileRegistry, ChatRegistry, AddressRouter)
├─ scripts/                    # Hardhat deploy + sync scripts
│  ├─ deploy_router.js
│  ├─ deploy_profile.js
│  ├─ deploy_chat.js
│  └─ sync-addresses.js
├─ deployments/                # Auto-written networks JSON (source of truth for addresses)
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ app/               # Next.js App Router (pages & API routes)
│     │  │  └─ api/lobby/messages/route.ts
│     │  │  └─ lobby/page.tsx
│     │  ├─ components/        # UI (NicknameForm, LobbyChat, etc.)
│     │  ├─ abi/               # Frontend ABIs
│     │  ├─ addresses/         # Auto-generated per-network files
│     │  ├─ addresses.json     # Auto-generated map for quick reads
│     │  └─ lib/
│     │     └─ supabase/       # server.ts (admin), client.ts (browser)
│     └─ .env.local            # NEXT_PUBLIC_* only (not committed)
├─ .github/workflows/ci.yml    # CI: compile + build
└─ README.md
```

---

## Scripts

**Root**

* `pnpm run compile` – Hardhat compile
* `pnpm run deploy:router` – Deploy AddressRouter + sync addresses
* `pnpm run deploy:profile` – Deploy ProfileRegistry (links BiomapperLogLib)
* `pnpm run deploy:chat` – Deploy ChatRegistry (links BiomapperLogLib)
* `pnpm run sync:addresses` – Re-write `deployments/*.json` → web address files
* `pnpm --filter web dev` – Run Next dev server
* `pnpm --filter web build` – Production build

**Web**

* `pnpm dev` – Next dev
* `pnpm build` – Next build

---

## How addresses work (no more copy/paste)

1. Deploy or update contracts
2. Router + deploy scripts write `deployments/humanode-testnet5.json`
3. `sync-addresses` generates **`apps/web/src/addresses/*`** and **`apps/web/src/addresses.json`**
4. Web app imports addresses from those files, with `NEXT_PUBLIC_*` as optional overrides (handy for testing).

---

## CI

* **GitHub Actions** run on push & PR:

  * pnpm install (workspaces)
  * Hardhat compile
  * Next.js build (typecheck + eslint)
* Secrets live in **Repository Settings → Secrets and variables → Actions**

  * Examples: `HUMANODE_RPC_URL`, `PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE` (if you later need it for server actions/tests)
* `main` is protected; PRs go to `dev` first.

---

## Contributing

* Branch: `feat/*`, `fix/*`, `chore/*`
* PRs → `dev`; keep commits focused
* Make sure CI is green (build, typecheck, lint)
* No secrets in commits

See **CONTRIBUTING.md** (coming with repo polish).

---

## Security

Found a vulnerability? Please email **[your-security-email@domain](mailto:your-security-email@domain)**.
Don’t open public issues for sensitive reports.

---

## License

MIT © 2025 Cyber-preacher

---

## Roadmap

* [ ] Private chats (address ↔ address) via ChatRegistry events
* [ ] Group chats (public & private)
* [ ] Supabase Realtime feed for lobby (optional)
* [ ] Basic E2E tests for API routes
* [ ] More robust biomapper UX (edge cases, error states)

---

## Troubleshooting

* **405 from `/api/...`**: Ensure your `route.ts` exports `GET`/`POST` functions.
* **“stream did not contain valid UTF-8”**: Recreate the file with UTF-8 (no BOM). We fixed this for `NicknameForm.tsx`.
* **“BigInt literals are not available…”**: TypeScript target must be **ES2020** (already set in `tsconfig.json`).
* **“Cannot find module 'webpack' types”**: We avoid importing webpack types in Next config. Use the built-in `config` param without typing it.
* **Address mismatch**: Run `pnpm run sync:addresses` after any deploy.
 main
