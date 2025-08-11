# CONTRIBUTING.md

Thanks for your interest in contributing to **Humanode Chat**! This doc explains how to set up the repo, propose changes, and get your PR merged.

## Repo layout

- **Root** — Hardhat config, contracts, deploy scripts, CI.
- **apps/web** — Next.js 15 app (App Router) with Wagmi/RainbowKit + Supabase.
- **deployments/** — Auto-written JSON with latest on-chain addresses (per network).

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- Git

```bash
corepack enable  # if you haven’t
npm i -g pnpm@9
```

## Quick start

```bash
# 1) Clone & install
pnpm -r install

# 2) Set environment variables
#   a) Contracts/Humanode (.env at repo root)
#      HUMANODE_RPC_URL=...
#      PRIVATE_KEY=...
#   b) Web/Supabase (apps/web/.env.local)
#      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
#      NEXT_PUBLIC_SUPABASE_URL=...
#      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
#      SUPABASE_SERVICE_ROLE=...
#      # optional overrides (frontend can also read from AddressRouter)
#      NEXT_PUBLIC_PROFILE_REGISTRY=0x...
#      NEXT_PUBLIC_CHAT_REGISTRY=0x...
#      NEXT_PUBLIC_BIOMAPPER_LOG=0x...

# 3) Compile contracts (root)
pnpm run compile

# 4) Deploy (optional)
#    These scripts write fresh addresses to deployments/ and apps/web/src/addresses/
#    and can be used instead of hand-updating .env values.
pnpm run deploy:router
pnpm run deploy:profile
pnpm run deploy:chat

# 5) Start the web app
pnpm --filter web dev
# http://localhost:3000
```

### Smoke tests (local)

- API: `GET /api/lobby/messages?limit=5` should return `{ ok: true, messages: [...] }`
- POST example:

```bash
curl -X POST http://localhost:3000/api/lobby/messages \
  -H 'content-type: application/json' \
  -d '{"senderAddress":"0xYourAddr","body":"hello"}'
```

- Lobby UI: visit `/lobby`.

## Branching & PR flow

- Default branches:

  - `main` — protected, release-ready.
  - `dev` — integration branch.

- Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.
- Open PRs **into `dev`**. A maintainer will promote `dev → main` via PR when ready.

### Commit style (Conventional Commits)

Examples:

- `feat(web): lobby chat UI`
- `fix(api): handle empty lobby`
- `chore(ci): cache pnpm`

## CI expectations

Our GitHub Action installs deps with **pnpm**, compiles contracts, and builds the Next.js app (which runs ESLint & type checks). Your PR should:

- ✅ `pnpm -r install` succeeds
- ✅ `pnpm run compile` (root) succeeds
- ✅ `pnpm --filter web build` succeeds (or the CI build step does)
- ✅ No secrets committed; `.env` files are ignored

## Coding standards

- **TypeScript** strict; avoid `any` in new code.
- **ESLint** runs during Next.js build; fix or `// eslint-disable-next-line <rule>` sparingly with rationale.
- **Style**: basic CSS-in-JS inline styles today; a component library/theming may be added later.
- **Security**: never commit secrets. Keep private keys & service roles in GitHub Secrets or local env only.
- **Contracts**: when you deploy, prefer the **AddressRouter** + `scripts/sync-addresses.js` to keep frontend addresses up to date.

## Useful scripts

From the repo **root**:

```bash
pnpm run compile         # hardhat compile
pnpm run deploy:router   # deploy AddressRouter + write addresses
pnpm run deploy:profile  # deploy ProfileRegistry + write addresses
pnpm run deploy:chat     # deploy ChatRegistry + write addresses
pnpm run sync:addresses  # re-write frontend/JSON from deployments

pnpm --filter web dev    # start Next.js dev server
pnpm --filter web build  # Next.js production build
pnpm --filter web seed   # seed Supabase lobby row (requires .env.local)
```

## Filing issues / feature requests

Please use the issue templates. Include:

- What you expected vs what happened
- Repro steps (commands, env, logs)
- Screenshots or GIF if UI-related

## License & attribution

This project is MIT-licensed. By contributing, you agree your contributions are licensed under the project’s license.
