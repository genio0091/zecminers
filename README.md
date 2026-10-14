# Hood Valley

**Hood Valley — Mine the Frontier.** An on-chain mining game for Robinhood Chain: 3,333 Valley Miners clock into one 12-hour shift a day and split a daily pool of **$VALLEY**. Season 1 holds 7,000,000,000 $VALLEY (~38,888,889 a day for about 180 days); when it is mined out, $VALLEY mining closes for good and Season 2 begins.

This repository holds the public website, the litepaper, **Valley HQ** (the game), the admin panel, the API, the double-entry ledger, the weekly payout pipeline, the scheduled jobs and the isolated signer. The UI follows the *Hood Valley Website Redesign* files (Website, Valley HQ dApp, Litepaper).

| | |
|---|---|
| Web + API | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Geologica / Jersey 10 / JetBrains Mono (self-hosted) |
| Auth | Auth.js v5: pass sign-in (pass address + claim code), admin-key team login, optional Discord OAuth, dev-only local login |
| Database | PostgreSQL 16+ (Neon in production) with Drizzle ORM and explicit SQL transactions |
| Jobs | GitHub Actions schedule (works on Vercel Hobby) → `/api/cron/[job]`, or the pg-boss worker on a VPS (same code) |
| Settlement | Weekly payouts to each pass address through the self-hosted indexer (Zebra + Zord). A mock indexer backed by the DB is used for local dev |
| Signer | Rust service with no public port. Dry-run by default and **refuses live mode** until a reviewed builder exists |
| Tests | Vitest + fast-check (economy), real-Postgres ledger and shift tests, Rust unit tests, a wording guard |

## The game

| Move | When | What the server does |
|---|---|---|
| **Deploy** | while the 12-hour window is open | records the Miner on today's shift with a weight = trait power × share of the window still left (joining late = smaller share) |
| **Extract** | until the window closes | nothing to do — Valley HQ shows the share building up |
| **Claim** | after the window closes | pays `⌊ day's pool × weight ÷ total weight of the shift ⌋` from the mining pool, exactly once |
| **Gear up** | after claiming | readies the Miner for the next shift; the first gear-up of a day extends the streak and pays a streak bonus from the community pool |

Tokenomics (fixed 10,000,000,000 $VALLEY), funded once at genesis:

| Pool | Share | $VALLEY |
|---|---|---|
| In-Game Mining (Season 1) | 70% | 7,000,000,000 |
| Protocol Liquidity | 15% | 1,500,000,000 |
| Community Raffles & Holder Benefits (raffles, streak bonuses, grants) | 8% | 800,000,000 |
| Presale LP Backing | 5% | 500,000,000 |
| Core Team | 2% | 200,000,000 |

Holder raffles give one free entry per active Valley Miner; draws are provably fair (seed commitment + future block hash, recomputable in the browser at `/raffles/[id]`).

## Repository layout

```
apps/
  web/            Next.js: website (/), litepaper (/litepaper), Valley HQ (/play), admin (/admin), API (app/api/**/route.ts)
  worker/         pg-boss scheduler for the jobs in packages/db/src/services/jobs.ts
  signer/         Rust payout signer (isolated host, outbound-only)
packages/
  economy/        pure rules: shift clock, pool shares, Miner status, streaks, Miner traits, raffle HMAC, payout planning (+ tests, simulation)
  zcash/          t-address base58check, ZIP 317 fees, inscription payloads, finality maths (+ tests)
  zord-client/    typed indexer client, Zebra JSON-RPC client, in-memory mock (+ tests)
  db/             Drizzle schema + migrations, postLedgerTx, invariants, shift/pass/payout/raffle/admin services
infra/
  chain/          docker compose for Zebra + Zord, zebrad.toml
  signer/         Dockerfile for the signer
  backup/         encrypted pg_dump script
docs/             architecture map, deployment (Vercel + Neon + Blob), genesis runbook, signer contract, API
```

## Quick start (local)

Requirements: Node 22+, pnpm 10, and PostgreSQL 16+ (`docker compose up -d`, or a local install). Redis is optional.

```bash
pnpm install
cp .env.example apps/web/.env.local        # then set AUTH_SECRET (npx auth secret)
pnpm db:migrate                             # uses DATABASE_URL from your shell
pnpm db:seed -- --dev                       # demo data: genesis, a 3-Miner demo login, an open holder raffle
pnpm dev                                    # http://localhost:3000
```

Open `/play` (Valley HQ) and sign in with a pass address and claim code. The dev seed prints them; with the default dev pepper the demo login holding three Miners is:

- address `t1Q1Brkh3nUZxV4xCzpCzwJR2sDL3LpSJhE`
- claim code `ZM-7F3A-91QD`

With `AUTH_DEV_LOGIN=true` you can also sign in with any name; use `admin` to get the admin panel.

**Team logins.** `pnpm --filter @hoodvalley/db team-logins -- --count 100 --out ~/team-logins.csv` (with the website's `DATABASE_URL` and `CLAIM_CODE_PEPPER`) writes `no,pass_number,address,claim_code`. Each row signs in to Valley HQ with its address + claim code and plays like a normal pass, but test passes are never included in a payout batch. Keep that CSV private and out of the repo.

`ZORD_MODE=mock` makes the indexer answer from the database, so reserve checks, pass-owner checks and the whole payout pipeline (cutoff → approval → simulated signer → settlement) run without Zebra or Zord.

Useful scripts:

```bash
pnpm test                 # all unit + integration tests (needs Postgres for packages/db)
pnpm typecheck            # every workspace
pnpm lint                 # ESLint (web)
pnpm build                # production build of the web app
pnpm simulate -- --miners 3333 --days 200    # Season 1 simulation: emission, mine-out day, streak spend, payout fees
pnpm dev:worker           # pg-boss worker against your local DB
cd apps/signer && cargo test && SIGNER_DATABASE_URL=… cargo run   # signer dry-run
```

## Deploying (Vercel + Neon + Blob)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). In short:

1. Import the repo in Vercel and set **Root Directory = `apps/web`**.
2. Add Neon from Vercel Storage. It sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. Push all tables: `DATABASE_URL_UNPOOLED=… pnpm db:migrate && DATABASE_URL=… pnpm db:seed`. On an existing deployment this also moves an old 80/10/5/5 genesis into the 70/15/8/5/2 pools.
4. Optionally upload the clips to a Blob store with `pnpm --filter @hoodvalley/web media:upload`, then set `NEXT_PUBLIC_MEDIA_BASE_URL`.
5. Set `AUTH_SECRET`, `ADMIN_ACCESS_KEY`, `CLAIM_CODE_PEPPER` (never change it once passes exist), `CRON_SECRET` and the Turnstile keys. `NEXT_PUBLIC_X_URL` / `NEXT_PUBLIC_DISCORD_URL` fill the footer links. Discord login is optional.
6. In GitHub → Actions secrets/variables, set `CRON_SECRET` and `SITE_URL` to turn on the scheduled jobs.

Season 1 opens on the day the genesis ledger transaction is posted (Admin → Genesis registry), or on `seasonStart` if the economy config sets one. Until then Valley HQ shows the Miners and explains why deploying is not open yet.

## Still to confirm before launch

These are marked TBA on the site and in the litepaper: contract addresses and audits, mint dates and pricing tiers, exact shift and raffle snapshot times, final trait mechanics (Miner traits and trait power are deterministic **pre-mint** values per pass until then), and streak bonus sizes. The on-chain transaction builder in the signer still needs its external security review before live payouts (see [docs/SIGNER.md](docs/SIGNER.md)).

## Ringkasan (Bahasa Indonesia)

Repo ini adalah Hood Valley (sebelumnya ZecMiners): website, litepaper, Valley HQ (game), panel admin, API, ledger double-entry, payout mingguan, job terjadwal dan signer.

- UI mengikuti file desain *Hood Valley Website Redesign*: Website, Valley HQ dApp, dan Litepaper.
- Game: satu shift 12 jam per hari — **Deploy → Extract → Claim → Gear up**. Klaim = bagian dari pool harian (~38,888,889 $VALLEY) sesuai bobot (trait power × lama kerja).
- Tokenomics: **70/15/8/5/2** dari 10B $VALLEY. Genesis lama 80/10/5/5 dipindahkan otomatis saat `pnpm db:seed`.
- Login tetap **alamat pass + claim code** (sama seperti CSV team logins), jadi login tim yang sudah ada tetap jalan.

## Disclaimer

Hood Valley is an independent project built on Robinhood Chain. It is not affiliated with, endorsed by or sponsored by Robinhood Markets, Inc. Nothing here is financial advice or a promise of value.
