# API

Every response has the shape `{ ok, data | error: { code, message, details? }, serverTime }`. Amounts are **strings**. Clients never send reward amounts. Countdowns use `serverTime` minus the client clock.

Mutations are POSTs. They are checked for **Origin**, return `MAINTENANCE` while maintenance is on (admin endpoints excepted), are rate limited, and validate their body with zod. Endpoints marked 🔑 require an `Idempotency-Key` header (8–128 chars). Endpoints marked 🛡 require a Cloudflare Turnstile token (`turnstileToken` in the body).

## Public

| Method | Path | |
|---|---|---|
| GET | `/api/public/token` | Token and pass collection facts from `chain_registry` |
| GET | `/api/public/por` | Latest proof-of-reserves snapshot, live treasury (cached 5 min), ledger pools |
| GET | `/api/public/raffles` | Raffles (the seed is shown only after the draw) |
| GET | `/api/public/raffles/:id/verify` | Seed, block hash, ticket ranges, winners, formula |
| POST | `/api/waitlist` 🛡 | Mint allowlist: three tasks, handle, Robinhood Chain wallet (`0x` + 40 hex, stored lower-case) |
| GET | `/api/health` | DB ping + maintenance flag |

## Player (signed in: wallet + claim code, or Discord)

| Method | Path | |
|---|---|---|
| GET | `/api/me` | Profile, pass (incl. `isTest`), in-game balance, next payout, config |
| POST | `/api/wallet/link` 🛡 | Address + one-time claim code, 5 per minute |
| GET | `/api/shift` | Valley HQ in one read: shift clock, today's pool and Miners on shift, your Miners (traits, power, status, share), Season 1 progress, streak, raffle entries, activity |
| POST | `/api/shift/deploy` | `{ slotIds }`: deploy ready Miners into the open window (one shift per Miner per day; late joins work fewer hours) |
| POST | `/api/shift/claim` | `{ slotIds? }`: claim every finished shift — share = day's pool × weight ÷ total weight, paid exactly once |
| POST | `/api/shift/gear` | `{ slotIds? }`: gear up claimed Miners; the first gear-up of a day extends the streak and pays the streak bonus |
| GET | `/api/ledger?cursor=&limit=` | Ledger history, cursor-paginated |
| GET | `/api/payouts` | Weekly payout history with txids |
| GET | `/api/raffles` | Raffles, your entry ranges, tip height |
| POST | `/api/raffles/:id/enter` | Holder raffle (ticket price 0): one free entry per active Miner, once per draw |
| POST | `/api/raffles/:id/tickets` 🔑🛡 | `{ count }`: paid raffles only, tickets leave circulation |

## Admin (role + optional IP allowlist; every action writes `admin_audit_log` with a reason)

| Method | Path | |
|---|---|---|
| GET | `/api/admin/overview` | Pools, Season 1 runway, recent shifts, batch, invariants, alerts, audit log, registry, chain tip |
| POST | `/api/admin/passes/import` | `{ lines, dryRun, reason }`: returns one-time claim codes **once** |
| GET | `/api/admin/passes/list` | Passes |
| POST | `/api/admin/passes/:id/deactivate` | Deactivate a pass in the game (the inscription stays on-chain) |
| POST | `/api/admin/passes/:id/inscription` | Record a pass's ZRC-721 inscription id |
| POST | `/api/admin/payouts/cutoff` | Run the weekly cutoff now (idempotent per ISO week) |
| POST | `/api/admin/payouts/:batchId/approve` | Approve a batch (refused if maintenance is on or reserves fail) |
| POST | `/api/admin/payouts/:batchId/hold` | Hold a batch |
| POST | `/api/admin/config` | Publish a new economy config version |
| POST | `/api/admin/raffles` | Open a raffle (seed commitment + draw height H; ticket price 0 = holder raffle) |
| POST | `/api/admin/raffles/:id/draw` | Draw after block H (block hash from Zebra) |
| POST | `/api/admin/grants` 🔑 | Grant from the community pool (8%) |
| GET | `/api/admin/users?q=` · `/api/admin/users/:id` | Search users · user detail + ledger |
| POST | `/api/admin/users/:id/freeze` | `{ frozen, reason }` |
| POST | `/api/admin/maintenance` | `{ on, reason }` |
| POST | `/api/admin/mining` | `{ halted, reason }` |
| POST | `/api/admin/genesis` | Record the genesis registry and (once) post the genesis ledger transaction; an old 80/10/5/5 genesis is moved into 70/15/8/5/2 |
| POST | `/api/admin/checks` | Run the reserve checks now |
| POST | `/api/admin/jobs/:job` | Run any scheduled job now |

## Cron

`GET /api/cron/:job` with `Authorization: Bearer $CRON_SECRET`. Jobs: `invariants`, `balance-cache`, `pass-owners`, `payout-cutoff`, `payout-settle`, `raffle-close`, `chain-lag`.

## Error codes

`PASS_MOVED`, `SESSION_ALREADY_STARTED`, `WINDOW_CLOSED`, `SEASON_NOT_STARTED`, `CLAIM_FIRST`, `GEAR_UP_FIRST`, `NOTHING_TO_CLAIM`, `NOTHING_TO_GEAR`, `POOL_EXHAUSTED`, `INSUFFICIENT_BALANCE`, `MAINTENANCE`, `RATE_LIMITED`, `NO_PASS`, `PASS_INACTIVE`, `ACCOUNT_FROZEN`, `INVALID_CLAIM`, `INVALID_ADDRESS`, `WALLET_ALREADY_LINKED`, `ADDRESS_TAKEN`, `RAFFLE_CLOSED`, `RAFFLE_NOT_READY`, `BATCH_STATE`, `IDEMPOTENCY_KEY_REQUIRED`, `TURNSTILE_FAILED`, `BAD_ORIGIN`, `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`.
