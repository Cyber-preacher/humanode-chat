## Humanode-chat

This project is an attempt to create a biomapper gated chat app.

Public chat + biomapper-gated nicknames on **Humanode Testnet-5**.  
Frontend: Next.js (App Router) + wagmi + RainbowKit.  
Contracts: Hardhat + Biomapper libraries.  
Storage: Supabase (Postgres + RLS).

![CI](https://github.com/Cyber-preacher/humanode-chat/actions/workflows/ci.yml/badge.svg)

---

## Quick start

### Requirements
- Node 20.x (LTS)
- pnpm 9.x
- A funded Humanode testnet wallet (eHMND)
- Supabase project (tables & policies) – see below

### 1) Install
```bash
pnpm install
