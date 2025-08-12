# Humanode Chat — Contributor-friendly README

Welcome! This repo is a small monorepo:

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

---

## Features

* Lobby chat page (`/lobby`)
* API routes

  * `GET /api/health` – quick health check `{ ok: true }`
  * `GET /api/lobby/messages?limit=n` – list recent lobby messages
  * `POST /api/lobby/messages` – add a message

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

### 3) Run the app

```bash
# Dev mode (Next.js)
# macOS/Linux
pnpm --filter web dev
# Windows
pnpm.cmd --filter web dev

# Open http://localhost:3000
```

### 4) (Optional) Seed sample data

```bash
# macOS/Linux
pnpm --filter web run seed
# Windows
pnpm.cmd --filter web run seed
```

---

## Scripts

### Root (workspace)

```bash
pnpm run compile         # hardhat compile
pnpm run test            # hardhat tests
pnpm run dev:web         # start Next.js dev server
pnpm run build           # build all workspaces
pnpm run build:web       # build web app only
pnpm run ci              # CI pipeline commands (install/compile/test/build)

pnpm run format          # prettier write
pnpm run format:check    # prettier check
```

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

We use **Jest** in the web app.

```bash
# all tests
pnpm -C apps/web test
# run a single file
pnpm -C apps/web test src/app/api/lobby/messages/route.test.ts -- --runInBand
```

The test suite includes a Supabase **mock** (`apps/web/src/__mocks__/supabaseServer.mock.ts`) so you can run tests locally without a live database.

---

## Linting & formatting

* **Prettier** is configured at the repo root. Run:

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

**Q: Tests can’t find my file on Windows.**

* Ensure the path is under `apps/web/src` and the file name matches `*.test.ts(x)`.
* Run with an explicit path: `pnpm -C apps/web test src/app/api/lobby/messages/route.test.ts -- --runInBand`.

**Q: API tests fail with 500.**

* Confirm your Supabase env vars are set for the web app (`apps/web/.env.local`).
* If you’re running tests only, the Supabase server is mocked; errors usually mean a typo or path mismatch. Re-install deps and retry.

---

Happy hacking! If anything is unclear, open a PR with improvements to this README or file an issue. 🙌
