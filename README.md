Humanode Chat

Status: early preview (v0.1.x) – contributions welcome!
Goal: the first private, sybil-resistant messenger powered by Humanode Biomapper (only biomapped wallets can set a nickname and participate in gated flows).

Monorepo layout (pnpm workspaces):

Frontend: Next.js 15 (App Router) + wagmi + RainbowKit

Smart contracts: Hardhat — AddressRouter (canonical addresses), ProfileRegistry (nicknames), ChatRegistry (events/hooks-ready)

Chain: Humanode Testnet-5 (chainId = 14853)

Storage: Supabase (Postgres) with RLS; public Lobby room + private rooms

API routes: /api/health, /api/lobby/messages, /api/chats, /api/chats/[id]/messages, stub /api/chats/dm

Rate limit: ~5 msgs / 30s / address (HTTP endpoints)

This repo is pnpm-native. On Windows shells that require it, use pnpm.cmd in commands below.

Repository structure
humanode-chat/
├─ apps/
│ └─ web/ # Next.js app (UI + API routes)
├─ contracts/ # Solidity: AddressRouter, ProfileRegistry, ChatRegistry
├─ deployments/ # Auto-written addresses (e.g. humanode-testnet5.json)
├─ scripts/ # Hardhat deploy + address sync
│ ├─ deploy_router.ts
│ ├─ deploy_profile.ts
│ ├─ deploy_chat.ts
│ └─ sync-addresses.ts
├─ tests/ # (contracts and web tests)
├─ .husky/ # pre-commit hooks
├─ .editorconfig
├─ .gitattributes # normalize line-endings (LF)
├─ .prettierrc.json
├─ pnpm-workspace.yaml
└─ package.json

Requirements

Node 20.x LTS (repo includes .nvmrc = 20)

pnpm 9.x

Supabase project (free tier OK)

Wallet for Humanode Testnet-5 (chainId 14853) to test on-chain nickname gating

The frontend validates envs with Zod (fail-fast, clear errors).

Setup

1. Install dependencies (run at repo root)

# macOS / Linux

pnpm install

# Windows (PowerShell / CMD)

pnpm.cmd install

2. Environment variables

Create files:

./apps/web/.env.local (required, client/server for web)

./.env (optional, for scripts)

Web (required):

    # RainbowKit / WalletConnect
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="..."

    # Network (defaults are fine; override if needed)
    NEXT_PUBLIC_CHAIN_ID="14853"

    # Optional: override contract addresses (normally synced from AddressRouter)
    NEXT_PUBLIC_ADDRESS_ROUTER="0x..."
    NEXT_PUBLIC_PROFILE_REGISTRY="0x..."
    NEXT_PUBLIC_CHAT_REGISTRY="0x..."

**Server (optional, only if you enable server-side admin operations):**

    SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY="service-role-..."

> File path of typed envs: `apps/web/src/env.ts` (Zod-validated).  
> **Never** expose `SERVICE_ROLE_KEY` to the browser.

---

## Contracts: compile, deploy, sync

    # macOS / Linux
    pnpm run compile
    pnpm run deploy:router
    pnpm run deploy:profile
    pnpm run deploy:chat
    pnpm run sync:addresses

    # Windows
    pnpm.cmd run compile
    pnpm.cmd run deploy:router
    pnpm.cmd run deploy:profile
    pnpm.cmd run deploy:chat
    pnpm.cmd run sync:addresses

What happens:

- Deploys to Humanode **Testnet-5**.
- Writes `deployments/humanode-testnet5.json`.
- Syncs `apps/web/src/addresses/*` and `apps/web/src/addresses.json` used by the frontend.

---

## Supabase schema (Lobby) & RLS

Run this in **Supabase SQL editor** once:

    -- Rooms (public lobby + other rooms)
    create table if not exists public.chats(
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      slug text not null unique,
      title text not null,
      is_public boolean not null default true
    );

    -- Messages
    create table if not exists public.messages(
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      chat_id uuid not null references public.chats(id) on delete cascade,
      sender_address text not null,
      body text not null
    );

    -- Seed Lobby
    insert into public.chats (slug, title, is_public)
    values ('lobby', 'Public Lobby', true)
    on conflict (slug) do nothing;

    -- Row Level Security
    alter table public.chats enable row level security;
    alter table public.messages enable row level security;

    -- Policies: public lobby readable by all
    create policy "read_public_chats" on public.chats
    for select using (is_public = true);

    create policy "read_public_messages" on public.messages
    for select using (
      exists (select 1 from public.chats c where c.id = messages.chat_id and c.is_public = true)
    );

    -- Insert into public rooms only
    create policy "write_public_messages" on public.messages
    for insert with check (
      exists (select 1 from public.chats c where c.id = chat_id and c.is_public = true)
    );

> For private rooms/DMs, use a `room_members(room_id, address)` table and adjust RLS to `exists (select 1 from room_members ...)`. (Planned below.)

---

## Run the app

    # macOS / Linux
    pnpm --filter web dev

    # Windows
    pnpm.cmd --filter web dev

    # open http://localhost:3000

---

## API surface (current)

- `GET /api/health` → `{ ok: true }`
- `GET /api/lobby/messages?limit=n` → recent lobby messages
- `POST /api/lobby/messages` → `{ senderAddress, body }`
  - **HTTP rate-limit:** ~**5 msgs / 30s / address** → `429` on exceed
- `GET /api/chats` / `POST /api/chats`
- `GET /api/chats/[id]/messages` / `POST /api/chats/[id]/messages`
- `POST /api/chats/dm` _(stub: will gate by biomapped nicknames via `ProfileRegistry` read)_

> **Never** put `page.tsx` under `/app/api/**` — it collides with route handlers.

---

## Roadmap (near-term)

1. **Supabase Realtime**
   - Live lobby & room messages
   - Presence (`address` online), typing indicators
2. **Direct Messages (biomapped-only)**
   - Deterministic `roomId = keccak256(sort([addrA, addrB]).join(':'))`
   - RLS via `room_members`
3. **Durable rate limit**
   - Upstash Redis (sliding window); headers: `RateLimit-Remaining`, `Retry-After`
4. **Security pass**
   - Server-side sanitize content; CSP (no inline scripts), `X-Content-Type-Options`, `Referrer-Policy`
5. **E2E**
   - Playwright for `/lobby` and `/chats/[id]`

---

## Linting & formatting

### Branching model

- Protected **`dev`** branch.
- Work on feature branches → PR to **`dev`**.
- Sync **`dev` → `main`** via **rebase (no merge commits)** using a sync branch.
- Required checks must pass (names match workflow jobs).

### Scripts (root)

    # macOS / Linux
    pnpm format:check
    pnpm -C apps/web test
    pnpm -C apps/web build

    # Windows
    pnpm.cmd format:check
    pnpm.cmd -C apps/web test
    pnpm.cmd -C apps/web build

### CI

- GitHub Actions: checkout, setup Node from `.nvmrc`, setup pnpm, workspace install, `format:check`, web tests, web build.
- CodeQL workflow included to satisfy protected-branch “Expected” checks.

---

## Troubleshooting (Windows & pnpm)

- Prefer `pnpm.cmd` in shells that require it.
- If you see EBUSY / lockfile issues:
  - Close watchers (VSCode, other terminals) and retry `pnpm.cmd install`.
- Ensure files are **UTF-8 (no BOM)**; `.gitattributes` enforces **LF** endings.
- If env validation fails, check `apps/web/src/env.ts` error output.

---

## License

# MIT

- `./apps/web/.env.local` (required, client/server for web)
- `./.env` (optional, for scripts)

**Web (required):**

```bash
# Supabase public client (publishable key, NOT anon)

NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb-publishable-..."

# RainbowKit / WalletConnect

NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="..."

# Network (defaults are fine; override if needed)

NEXT_PUBLIC_CHAIN_ID="14853"

# Optional: override contract addresses (normally synced from AddressRouter)

NEXT_PUBLIC_ADDRESS_ROUTER="0x..."
NEXT_PUBLIC_PROFILE_REGISTRY="0x..."
NEXT_PUBLIC_CHAT_REGISTRY="0x..."

Server (optional, only if you enable server-side admin operations):

SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="service-role-..."

File path of typed envs: apps/web/src/env.ts. Never expose SERVICE_ROLE_KEY to the browser.

Contracts: compile, deploy, sync

# macOS / Linux

pnpm run compile
pnpm run deploy:router
pnpm run deploy:profile
pnpm run deploy:chat
pnpm run sync:addresses

# Windows

pnpm.cmd run compile
pnpm.cmd run deploy:router
pnpm.cmd run deploy:profile
pnpm.cmd run deploy:chat
pnpm.cmd run sync:addresses

What happens:

Deploys to Humanode Testnet-5.

Writes deployments/humanode-testnet5.json.

Syncs apps/web/src/addresses/\* and apps/web/src/addresses.json.

Supabase schema (Lobby) & RLS

Run this in Supabase SQL editor once:

-- Rooms (public lobby + other rooms)
create table if not exists public.chats(
id uuid primary key default gen_random_uuid(),
created_at timestamptz not null default now(),
slug text not null unique,
title text not null,
is_public boolean not null default true
);

-- Messages
create table if not exists public.messages(
id uuid primary key default gen_random_uuid(),
created_at timestamptz not null default now(),
chat_id uuid not null references public.chats(id) on delete cascade,
sender_address text not null,
body text not null
);

-- Seed Lobby
insert into public.chats (slug, title, is_public)
values ('lobby', 'Public Lobby', true)
on conflict (slug) do nothing;

-- Row Level Security
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Policies: public lobby readable by all
create policy "read_public_chats" on public.chats
for select using (is_public = true);

create policy "read_public_messages" on public.messages
for select using (
exists (
select 1 from public.chats c
where c.id = messages.chat_id and c.is_public = true
)
);

-- Insert into public rooms only
create policy "write_public_messages" on public.messages
for insert with check (
exists (
select 1 from public.chats c
where c.id = chat_id and c.is_public = true
)
);

For private rooms/DMs, use a room_members(room_id, address) table and adjust RLS to
exists (select 1 from room_members ...).

Run the app

# macOS / Linux

pnpm --filter web dev

# Windows

pnpm.cmd --filter web dev

# open http://localhost:3000

API surface (current)

GET /api/health → { ok: true }

GET /api/lobby/messages?limit=n → recent lobby messages

POST /api/lobby/messages → { senderAddress, body }

HTTP rate-limit: ~5 msgs / 30s / address → 429 on exceed

GET /api/chats / POST /api/chats

GET /api/chats/[id]/messages / POST /api/chats/[id]/messages

POST /api/chats/dm (stub: will gate by biomapped nicknames via ProfileRegistry read)

Never put page.tsx under /app/api/\*\* — it collides with route handlers.

Roadmap (near-term)

Supabase Realtime

Live lobby & room messages

Presence (address online), typing indicators

Direct Messages (biomapped-only)

Deterministic roomId = keccak256(sort([addrA, addrB]).join(':'))

RLS via room_members

Durable rate limit

Upstash Redis (sliding window); headers: RateLimit-Remaining, Retry-After

Security pass

Server-side sanitize content; CSP (no inline scripts), X-Content-Type-Options, Referrer-Policy

E2E

Playwright for /lobby and /chats/[id]

Contributing
Branching model

Protected dev branch.

Work on feature branches → PR to dev.

Sync dev → main via rebase (no merge commits) using a sync branch.

Required checks must pass (names match workflow jobs).

Scripts (root)

# macOS / Linux

pnpm format:check
pnpm -C apps/web test
pnpm -C apps/web build

# Windows

pnpm.cmd format:check
pnpm.cmd -C apps/web test
pnpm.cmd -C apps/web build

CI

GitHub Actions: checkout, setup Node from .nvmrc, setup pnpm, workspace install, format:check, web tests, web build.

CodeQL workflow included to satisfy protected-branch “Expected” checks.

Troubleshooting (Windows & pnpm)

Prefer pnpm.cmd in shells that require it.

If you see EBUSY / lockfile issues: close watchers (VS Code, other terminals) and retry pnpm.cmd install.

Ensure files are UTF-8 (no BOM); .gitattributes enforces LF endings.

If env validation fails, check apps/web/src/env.ts error output.

License

MIT
