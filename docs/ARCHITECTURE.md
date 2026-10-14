# Architecture

```mermaid
flowchart LR
  B[Browser<br/>Next.js: site, litepaper, Valley HQ] --> A[API<br/>app/api/**/route.ts]
  A --> D[(PostgreSQL / Neon<br/>ledger + game)]
  A --> R[(Redis<br/>rate limit)]
  W[Worker / Vercel Cron<br/>services/jobs.ts] --> D
  W --> Z[Zord API]
  Z --> N[Zebra node]
  S[Signer<br/>apps/signer] -->|outbound only| D
  S -->|broadcast| N
```

The browser never talks to Zord or the node directly. All chain data reaches it through our own cached API.

| Blueprint | Where |
|---|---|
| §3.1 ZRC-20 deploy/mint/transfer payloads | `packages/zcash/src/inscriptions.ts`, `apps/signer/src/payload.rs` |
| §3.2 Zord as source of truth | `packages/zord-client/src/zord.ts` (paths overridable via `ZORD_PATH_*`) |
| §3.5 ZIP 317 fees | `packages/zcash/src/fees.ts`, `apps/signer/src/fee.rs` |
| §2 finality (12 → 36 conf), expiry, NU7 freeze | `packages/zcash/src/finality.ts`, `system_flags.freeze_windows`, `inFreezeWindow()` |
| Tokenomics 70/15/8/5/2 | `packages/economy/src/constants.ts` → genesis tx `postGenesis()`; `reallocateLegacyPools()` moves an older 80/10/5/5 genesis |
| §4.2 / §8.4 invariants | `packages/db/src/invariants.ts`, job `invariants` (5 min), `balance-cache` (hourly) |
| §4.4 sink (burn vs recycle) | `EconomyParams.sinkMode` (default `burn`) |
| Public copy | `apps/web/lib/content.ts` (website, litepaper, FAQ) + `content.test.ts` (allocation, daily pool, forbidden phrases, old brand) |
| §5.3 server-authoritative | services never accept amounts from clients; time = server UTC |
| §6.5 chain_registry, PoR page | `chain_registry` table, `/proof-of-reserves`, `/api/public/por`, Admin → Genesis registry |
| §6.7 / §7.2 soulbound pass, claim codes | `packages/db/src/services/passes.ts` (HMAC-peppered codes, owner check job) |
| §7.1 Discord login, account age | `apps/web/auth.ts` |
| Daily shift: clock, Miner status, pool shares, streak | `packages/economy/src/shift.ts`, `services/game.ts` (`getShift`, `deployMiners`, `claimMiners`, `gearUpMiners`) |
| §7.4 versioned economy config | `economy_config` (append-only), `publishEconomyConfig()`, Admin → Economy config |
| Valley Miner traits (pre-mint, deterministic per pass) | `packages/economy/src/miners.ts` |
| §7.6 provably fair raffle | `economy/raffle.ts` (HMAC-SHA256), `services/raffles.ts`, `/raffles/[id]` browser verifier |
| §7.7 anti-bot | Turnstile (`lib/turnstile.ts`), rate limits (`lib/rate-limit.ts`), freeze |
| Valley HQ + admin panel | `components/game/*` (Shift, Raffles, Season, Wallet), `components/admin/admin-app.tsx` |
| Tables | `packages/db/src/schema.ts` → `packages/db/drizzle/*.sql` (`0003_hood_valley` adds shift weights, gear-up and `shift_days`) |
| §8.3 ledger function | `postLedgerTx()` in `packages/db/src/ledger.ts` |
| §9 API + rules | `apps/web/app/api/**`, `lib/api.ts` (Origin check, idempotency, zod, typed errors, `serverTime`, maintenance) |
| §10 weekly payout | `services/payouts.ts` (cutoff → approval → settle/return), signer contract in [SIGNER.md](SIGNER.md) |
| §11 security, monitoring | CSP/HSTS in `next.config.ts`, alerts → Discord/Telegram, `infra/` |
| §12.1 tests | `packages/*/test`, `apps/web/lib/*.test.ts`, `apps/signer` `cargo test` |

## Ledger accounts

| Code | Meaning |
|---|---|
| `pool_mining` (7B), `pool_liquidity` (1.5B), `pool_community` (800M), `pool_presale_lp` (500M), `pool_team` (200M) | funded once at genesis (70/15/8/5/2) |
| `pool_daily`, `pool_marketing` | pre-Hood Valley pools, emptied into the new split |
| `user:<uuid>` | player's in-game balance |
| `sink_burned` | spent in game (paid raffle tickets) when `sinkMode = burn` |
| `payout_pending` | balances moved out at the weekly cutoff, not yet settled on-chain |
| `treasury_backing` | the only account allowed below zero: −(10B − settled payouts) |

The sum of all accounts is always 0. The sum of every account except `treasury_backing` always equals 10,000,000,000 − settled payouts.

## Idempotency keys

`claim:{session}` · `streak:{user}:{day}` · `holder:{raffle}:{user}` · `raffle:{raffle}:{user}:{key}` · `raffle-prize:{raffle}:{k}` · `grant:{key}` · `payout-cutoff:{batch}:{user}` · `payout:{batch}:{user}` · `payout-return:{batch}:{user}` · `genesis` · `reallocate:hood-valley`

## Payout item states

`pending` → (admin approves) `approved` → (signer) `signing` → `inscribed` (tx1) → `sent` (tx2) → (worker, after finality + Zord check) `settled`.
Errors go back to `approved` for a retry. After the maximum attempts an item is `failed`, then the worker marks it `returned` (credited back to the player).
