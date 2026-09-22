# zecminers

**ZecMiners** is a pixel mining game on Zcash. Holders of a soulbound Whitelist Pass mine **$ZGEMS**, a ZRC-20 token on Zcash mainnet, in 12-hour browser sessions. Everything they mine is paid to their ZRC-20 wallet in a weekly batch.

> No liquidity pool at launch. Official trading starts after the NFT mint.

This repository is the full build described in *ZecMiners — Developer Blueprint: $ZGEMS (ZRC-20 di Zcash) & Website Mining* (19 Sep 2026). It includes the public website, the mining game, the admin panel, the API, the double-entry ledger, the weekly payout pipeline, the scheduled jobs and the isolated signer. The UI follows the *ZecMiners Website Redesign* files.

| | |
|---|---|
| Web + API | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 |
| Game canvas | Phaser 4, pixel art generated in code. It is pure presentation; all state comes from the server |
| Auth | Auth.js v5 with Discord OAuth, plus a dev-only local login |
| Database | PostgreSQL 16+ (Neon in production) with Drizzle ORM and explicit SQL transactions |
| Jobs | pg-boss worker (VPS) **or** Vercel Cron → `/api/cron/[job]` (same code) |
| Chain | Zebra node + self-hosted Zord indexer. A mock indexer backed by the DB is used for local dev |
| Signer | Rust service with no public port. Dry-run by default and **refuses live mode** until a reviewed builder exists |
| Tests | Vitest + fast-check (economy), real-Postgres ledger tests, Rust unit tests, a wording guard |

## Repository layout

```
apps/
  web/            Next.js site, game (/play), admin (/admin), API (app/api/**/route.ts)
  worker/         pg-boss scheduler for the jobs in packages/db/src/services/jobs.ts
  signer/         Rust payout signer (isolated host, outbound-only)
packages/
  economy/        pure rules: rewards, streaks, ore drops, raffle HMAC, payout planning, time (+ tests, simulation)
  zcash/          t-address base58check, ZIP 317 fees, ZRC-20/721 payloads, finality maths (+ tests)
  zord-client/    typed Zord indexer client, Zebra JSON-RPC client, in-memory mock (+ tests)
  db/             Drizzle schema + migrations, postLedgerTx, invariants, game/pass/payout/raffle/admin services
infra/
  chain/          docker compose for Zebra + Zord, zebrad.toml
  signer/         Dockerfile for the signer
  backup/         encrypted pg_dump script
docs/             architecture map, deployment (Vercel + Neon + Blob), Phase 0 runbook, signer contract, API
```

## Quick start (local)

Requirements: Node 22+, pnpm 10, and PostgreSQL 16+ (`docker compose up -d`, or a local install). Redis is optional.

```bash
pnpm install
cp .env.example apps/web/.env.local        # then set AUTH_SECRET (npx auth secret)
pnpm db:migrate                             # uses DATABASE_URL from your shell
pnpm db:seed -- --dev                       # demo data: genesis, a demo pass, a raffle
pnpm dev                                    # http://localhost:3000
```

With `AUTH_DEV_LOGIN=true`, open `/play` and sign in with any name. Use the name `admin` to get the admin panel. Link the demo pass with these values:

- address `t1J2iwGHQcpvngLWhagnPd7ovoysJADyJi8`
- claim code `ZM-7F3A-91QD`

Extra dev passes are printed by the seed script.

`ZORD_MODE=mock` makes the indexer answer from the database, so reserve checks, pass-owner checks and the whole payout pipeline (cutoff → approval → simulated signer → settlement) run without Zebra or Zord.

Useful scripts:

```bash
pnpm test                 # all unit + integration tests (needs Postgres for packages/db)
pnpm typecheck            # every workspace
pnpm lint                 # ESLint (web)
pnpm build                # production build of the web app
pnpm simulate -- --users 1000 --days 365     # economy simulation: emission, runway, payout fees
pnpm dev:worker           # pg-boss worker against your local DB
cd apps/signer && cargo test && SIGNER_DATABASE_URL=… cargo run   # signer dry-run
```

## Deploying (Vercel + Neon + Blob)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). In short:

1. Import the repo in Vercel and set **Root Directory = `apps/web`**.
2. Add Neon from Vercel Storage. It sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. Push all tables: `DATABASE_URL_UNPOOLED=… pnpm db:migrate && DATABASE_URL=… pnpm db:seed`.
4. Add a Blob store and run `pnpm --filter @zecminers/web media:upload`. Then set `NEXT_PUBLIC_MEDIA_BASE_URL`.
5. Set `AUTH_SECRET`, the Discord OAuth values, `CLAIM_CODE_PEPPER`, `CRON_SECRET`, Turnstile keys and `ADMIN_DISCORD_IDS`.

## What is done, and what still has to happen before launch

Done and tested:

- The website, docs, proof of reserves and raffle verification (recomputed in the browser).
- The game: start/collect/upgrade/repair, daily streak, ore and shop, raffles, ledger and payout history.
- The admin panel: pass import with one-time claim codes, weekly batch approve/hold, versioned economy config, raffles, users, freeze and grants, maintenance, the genesis registry, audit log and alerts.
- The ledger: double-entry, append-only by trigger, idempotency keys, no negative balances. 100 parallel collects pay exactly once.
- The reserve invariants and circuit breaker (maintenance on + all batches held).
- The weekly payout pipeline up to the signer boundary, including settlement after finality and returns on failure.

**Blocked on the blueprint's M0/M3 work. These are deliberately not faked:**

- **Zord API shapes (§3.3).** `packages/zord-client` maps the documented endpoints with overridable paths (`ZORD_PATH_*`). Confirm them against the `zatoshilabs/zord` source.
- **Transaction building (§10.3–10.4).** `apps/signer` has the ZIP 317 fees, the payloads, UTXO safety rules and the outbound queue. The tx1/tx2 builder must be written on `librustzcash` and pass an **external security review**. Until then live mode exits with code 3.
- **Phase 0 genesis (§6).** This is a manual, off-server ceremony (see [docs/GENESIS.md](docs/GENESIS.md)). Afterwards, record the txids in Admin → Genesis registry.
- **Open decisions (§13.1).** Ticker fallback, pass collection name and supply, final economy values, minimum payout, raffle prize source, and the legal review of paid raffles.

## Ringkasan (Bahasa Indonesia)

Repo ini adalah implementasi lengkap blueprint ZecMiners. Isinya website (desain dari *ZecMiners Website Redesign*), game mining, panel admin, API, ledger double-entry, payout mingguan, job terjadwal dan signer terisolasi.

- Alokasi mengikuti blueprint: **80/10/5/5**.
- Wording trading persis: *"No liquidity pool at launch. Official trading starts after the NFT mint."* Ada test yang menggagalkan build kalau muncul kalimat "can't be traded".
- Yang **sengaja belum** dibuat adalah builder transaksi on-chain di signer. Ini wajib ditulis dengan `librustzcash` dan direview pihak eksternal sebelum launch, sesuai Bagian 10 blueprint.
- Deploy ke Vercel + Neon + Blob ada di `docs/DEPLOYMENT.md`.

## Disclaimer

ZecMiners is a game. $ZGEMS has no liquidity pool at launch; official trading starts after the NFT mint. Nothing here is financial advice or a promise of value. ZecMiners is an independent project and is not affiliated with or endorsed by any Zcash development organization.
