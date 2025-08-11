<<<<<<< HEAD
# Humanode Chat — Contributor-friendly README
=======
chore/release-drafter-triggers
[![CI](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/ci.yml/badge.svg)](…)
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))

Welcome! This repo is a small monorepo:

<<<<<<< HEAD
```
humanode-chat/
├─ apps/
│  └─ web/                # Next.js app (chat UI + API routes)
├─ contracts & scripts    # Hardhat contracts / deploy scripts
├─ .husky/                # Git hooks
├─ .lintstagedrc.json     # On-commit formatting/lint
├─ .editorconfig          # Cross-OS editor defaults
├─ .gitattributes         # Line endings normalisation
├─ .prettierrc.json       # Prettier config
├─ pnpm-workspace.yaml    # pnpm monorepo
└─ package.json           # workspace root scripts
```

> **Package manager:** pnpm. On Windows, use `pnpm.cmd` instead of `pnpm` in terminals that require it.
=======
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

1. Install
   pnpm install
   =======

# Humanode Chat

[![CI](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/ci.yml)

Humanode-gated chat prototype:

- **Biomapper** check on Humanode Testnet-5 (only biomapped wallets can set a nickname)
- On-chain **ProfileRegistry** (nickname) & **ChatRegistry** (events/hooks ready)
- **Next.js 15 + wagmi + RainbowKit** front-end
- **Supabase** for lobby messages (public room), RLS-safe
- Address **Router** + auto-sync so you don’t copy/paste contract addresses ever again

> Status: early preview (`v0.1.x`). Contributions welcome!
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))

---

## Features

* Lobby chat page (`/lobby`)
* API routes

<<<<<<< HEAD
  * `GET /api/health` – quick health check `{ ok: true }`
  * `GET /api/lobby/messages?limit=n` – list recent lobby messages
  * `POST /api/lobby/messages` – add a message
=======
- Node.js 20.x
- pnpm 9.x
- Metamask (or WalletConnect) on **Humanode Testnet-5** (Chain ID `14853`)
- Supabase project (free tier OK)
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))

    * Body: `{ senderAddress: "0x…40 hex…", body: "text" }`
    * Rate limit: **max 5 msgs / 30s per address** (429 on exceed)
* Supabase data layer (typed env validation)
* Jest tests for the lobby API
* Prettier + ESLint + Husky + lint-staged

---

## Prerequisites

* **Node.js** ≥ 18.17 (< 23 recommended). The repo includes `.nvmrc` for Node 20.
* **pnpm** ≥ 8 (we use 10.x locally). Install: `npm i -g pnpm`.
* **Supabase project** (URL + anon key + service role key).

---

## Quick start

### 1) Install deps (at repo root)

```bash
# macOS/Linux
pnpm install
# Windows (PowerShell / CMD)
pnpm.cmd install
```

### 2) Environment variables

Copy `.env.example` to **both** of these locations and fill values:

* Root (for scripts, optional): `./.env`
* Web app: `./apps/web/.env.local`

Required keys for the web app:

```
# Public client-side keys
NEXT_PUBLIC_SUPABASE_URL="https://...supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# Server-side keys (not exposed to browser)
SUPABASE_URL="https://...supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
```

> The web app performs Zod validation via `apps/web/src/env.ts` and will error clearly if something is missing.

<<<<<<< HEAD
### 3) Run the app
=======
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

- Writes canonical addresses to **`deployments/humanode-testnet5.json`**
- Generates frontend address source files in **`apps/web/src/addresses/`** and **`apps/web/src/addresses.json`**
- The web app prefers these files; `NEXT_PUBLIC_*` can still override for testing.

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
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))

```bash
# Dev mode (Next.js)
# macOS/Linux
pnpm --filter web dev
# Windows
pnpm.cmd --filter web dev

# Open http://localhost:3000
```

### 4) (Optional) Seed sample data

<<<<<<< HEAD
```bash
# macOS/Linux
pnpm --filter web run seed
# Windows
pnpm.cmd --filter web run seed
=======
- **Connect wallet**, ensure you’re on **Humanode Testnet-5**
- Biomapper status shows **Verified** if your address is biomapped
- Set nickname (on-chain)
- Visit **/lobby** to read/send messages (Supabase)

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
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))
```

---

## Scripts

### Root (workspace)

<<<<<<< HEAD
```bash
pnpm run compile         # hardhat compile
pnpm run test            # hardhat tests
pnpm run dev:web         # start Next.js dev server
pnpm run build           # build all workspaces
pnpm run build:web       # build web app only
pnpm run ci              # CI pipeline commands (install/compile/test/build)
=======
- `pnpm run compile` – Hardhat compile
- `pnpm run deploy:router` – Deploy AddressRouter + sync addresses
- `pnpm run deploy:profile` – Deploy ProfileRegistry (links BiomapperLogLib)
- `pnpm run deploy:chat` – Deploy ChatRegistry (links BiomapperLogLib)
- `pnpm run sync:addresses` – Re-write `deployments/*.json` → web address files
- `pnpm --filter web dev` – Run Next dev server
- `pnpm --filter web build` – Production build
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))

pnpm run format          # prettier write
pnpm run format:check    # prettier check
```

<<<<<<< HEAD
### Web app (`apps/web`)

```bash
pnpm -C apps/web test        # run Jest test suite
pnpm -C apps/web test:watch  # watch mode
pnpm -C apps/web build       # build Next.js
pnpm -C apps/web start       # start production build
pnpm -C apps/web lint        # run ESLint
pnpm -C apps/web run seed    # seed helper (if provided by your env)
```

> On Windows, replace `pnpm` with `pnpm.cmd`.
=======
- `pnpm dev` – Next dev
- `pnpm build` – Next build
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))

---

## API details

### GET /api/health

Response:

```json
{ "ok": true }
```

### GET /api/lobby/messages?limit=50

Query:

* `limit` – integer 1..100 (default 50)

Response:

```json
{
  "ok": true,
  "messages": [
    {
      "id": "m1",
      "chat_id": "…",
      "sender_address": "0x…",
      "body": "hello",
      "created_at": "2025-08-11T12:00:00.000Z"
    }
  ]
}
```

### POST /api/lobby/messages

Body:

```json
{ "senderAddress": "0x…40 hex…", "body": "your message" }
```

Validation & errors:

* `Invalid Ethereum address` (400)
* `Message cannot be empty` / `Message too long (max 2000 chars)` (400)
* Rate limit: **5 messages / 30s** (429)

---

## Testing

<<<<<<< HEAD
We use **Jest** in the web app.

```bash
# all tests
pnpm -C apps/web test
# run a single file
pnpm -C apps/web test src/app/api/lobby/messages/route.test.ts -- --runInBand
```

The test suite includes a Supabase **mock** (`apps/web/src/__mocks__/supabaseServer.mock.ts`) so you can run tests locally without a live database.
=======
- **GitHub Actions** run on push & PR:

  - pnpm install (workspaces)
  - Hardhat compile
  - Next.js build (typecheck + eslint)

- Secrets live in **Repository Settings → Secrets and variables → Actions**

  - Examples: `HUMANODE_RPC_URL`, `PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE` (if you later need it for server actions/tests)

- `main` is protected; PRs go to `dev` first.
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))

---

## Linting & formatting

<<<<<<< HEAD
* **Prettier** is configured at the repo root. Run:
=======
- Branch: `feat/*`, `fix/*`, `chore/*`
- PRs → `dev`; keep commits focused
- Make sure CI is green (build, typecheck, lint)
- No secrets in commits
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))

  ```bash
  pnpm run format:check
  pnpm run format
  ```
* **ESLint** runs via `lint-staged` on commit and can be invoked manually:

  ```bash
  pnpm -C apps/web run lint
  ```
* **Husky** (v10) sets pre-commit hooks. If needed (e.g., emergency), you can bypass with `--no-verify`—but please fix issues instead of bypassing when possible.

---

## Contributing guide

1. **Fork / branch**: `feature/<thing>`, `fix/<thing>`, `refactor/<thing>`.
2. **Conventional commits** are appreciated: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`…
3. **Before pushing**:

   * `pnpm run format:check` (root)
   * `pnpm -C apps/web test`
   * `pnpm -C apps/web build`
4. **Open a PR** against `dev`.

   * Fill a clear description.
   * Ensure CI is green.

**Branch protection**: the repo may require certain checks (e.g., `CI / build (push)`, CodeQL). If you see “checks expected”, wait for GitHub Actions to start or re-run them.

---

## Development tips (Windows)

* Use **PowerShell** or **Git Bash**. When in doubt, prefer `pnpm.cmd`.
* Line endings are normalised via `.gitattributes`. If you see warnings, you’re safe to ignore.
* Jest sometimes caches aggressively. If tests aren’t discovered, try:

  ```bash
  pnpm -C apps/web test -- --clearCache
  ```

---

## Security

Please disclose security issues privately—do **not** open a public issue first. See `SECURITY.md` if present, or contact the maintainers.

## License

See `LICENSE` in the repo.

---

## FAQ

<<<<<<< HEAD
**Q: Tests can’t find my file on Windows.**

* Ensure the path is under `apps/web/src` and the file name matches `*.test.ts(x)`.
* Run with an explicit path: `pnpm -C apps/web test src/app/api/lobby/messages/route.test.ts -- --runInBand`.

**Q: API tests fail with 500.**

* Confirm your Supabase env vars are set for the web app (`apps/web/.env.local`).
* If you’re running tests only, the Supabase server is mocked; errors usually mean a typo or path mismatch. Re-install deps and retry.

---

Happy hacking! If anything is unclear, open a PR with improvements to this README or file an issue. 🙌
=======
- [ ] Private chats (address ↔ address) via ChatRegistry events
- [ ] Group chats (public & private)
- [ ] Supabase Realtime feed for lobby (optional)
- [ ] Basic E2E tests for API routes
- [ ] More robust biomapper UX (edge cases, error states)

---

## Troubleshooting

- **405 from `/api/...`**: Ensure your `route.ts` exports `GET`/`POST` functions.
- **“stream did not contain valid UTF-8”**: Recreate the file with UTF-8 (no BOM). We fixed this for `NicknameForm.tsx`.
- **“BigInt literals are not available…”**: TypeScript target must be **ES2020** (already set in `tsconfig.json`).
- **“Cannot find module 'webpack' types”**: We avoid importing webpack types in Next config. Use the built-in `config` param without typing it.
- **Address mismatch**: Run `pnpm run sync:addresses` after any deploy.
  main
>>>>>>> 2206f99 (chore(lint-staged): don't fail on warnings; keep autofix (#26))
