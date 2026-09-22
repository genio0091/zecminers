# API (blueprint §9)

Every response has the shape `{ ok, data | error: { code, message, details? }, serverTime }`. Amounts are **strings**. Clients never send reward amounts. Countdowns use `serverTime` minus the client clock.

Mutations are POSTs. They are checked for **Origin**, return `MAINTENANCE` while maintenance is on (admin endpoints excepted), are rate limited, and validate their body with zod. Endpoints marked 🔑 require an `Idempotency-Key` header (8–128 chars). Endpoints marked 🛡 require a Cloudflare Turnstile token (`turnstileToken` in the body).

## Public

| Method | Path | |
|---|---|---|
| GET | `/api/public/token` | Token and pass collection facts from `chain_registry` |
| GET | `/api/public/por` | Latest proof-of-reserves snapshot, live treasury (cached 5 min), ledger pools |
| GET | `/api/public/raffles` | Raffles (the seed is shown only after the draw) |
| GET | `/api/public/raffles/:id/verify` | Seed, block hash, ticket ranges, winners, formula |
| POST | `/api/waitlist` 🛡 | Pass waitlist (handle + t1 address, base58check) |
| GET | `/api/health` | DB ping + maintenance flag |

## Player (signed in: wallet + claim code, or Discord)

| Method | Path | |
|---|---|---|
| GET | `/api/me` | Profile, pass, in-game balance, daily streak, next payout, config |
| POST | `/api/wallet/link` 🛡 | Address + one-time claim code, 5 per minute |
| GET | `/api/slots` | Slots with derived state (idle/mining/ready/broken/repairing/stopped) and timers |
| POST | `/api/slots/:id/start` | Start today's session (unique per slot per UTC day) |
| POST | `/api/slots/:id/collect` | Credit the server-computed reward and end the session |
| POST | `/api/slots/:id/upgrade` 🔑 | Pay the upgrade cost and go up a level (restores durability) |
| POST | `/api/slots/:id/repair` 🔑 | Pay the repair cost and start the 24 h wait |
| POST | `/api/daily/claim` | Daily reward and streak |
| GET | `/api/ledger?cursor=&limit=` | Ledger history, cursor-paginated |
| GET | `/api/payouts` | Weekly payout history with txids |
| GET | `/api/inventory` | Ore inventory and shop rates |
| POST | `/api/shop/exchange` 🔑 | `{ item, qty }`: ore to $ZGEMS |
| GET | `/api/raffles` | Raffles, your ticket ranges, tip height |
| POST | `/api/raffles/:id/tickets` 🔑🛡 | `{ count }` |

## Admin (role + optional IP allowlist; every action writes `admin_audit_log` with a reason)

| Method | Path | |
|---|---|---|
| GET | `/api/admin/overview` | Pools, runway, batch, invariants, alerts, audit log, registry, chain tip |
| POST | `/api/admin/passes/import` | `{ lines, dryRun, reason }`: returns one-time claim codes **once** |
| GET | `/api/admin/passes/list` | Passes |
| POST | `/api/admin/passes/:id/deactivate` | Deactivate a pass in the game (the inscription stays on-chain) |
| POST | `/api/admin/passes/:id/inscription` | Record a pass's ZRC-721 inscription id |
| POST | `/api/admin/payouts/cutoff` | Run the weekly cutoff now (idempotent per ISO week) |
| POST | `/api/admin/payouts/:batchId/approve` | Approve a batch (refused if maintenance is on or reserves fail) |
| POST | `/api/admin/payouts/:batchId/hold` | Hold a batch |
| POST | `/api/admin/config` | Publish a new economy config version |
| POST | `/api/admin/raffles` | Open a raffle (seed commitment + closing height H) |
| POST | `/api/admin/raffles/:id/draw` | Draw after block H (block hash from Zebra) |
| POST | `/api/admin/grants` 🔑 | Grant from the marketing pool |
| GET | `/api/admin/users?q=` · `/api/admin/users/:id` | Search users · user detail + ledger |
| POST | `/api/admin/users/:id/freeze` | `{ frozen, reason }` |
| POST | `/api/admin/maintenance` | `{ on, reason }` |
| POST | `/api/admin/mining` | `{ halted, reason }` |
| POST | `/api/admin/genesis` | Record the Phase 0 registry and (once) post the genesis ledger transaction |
| POST | `/api/admin/checks` | Run the reserve checks now |
| POST | `/api/admin/jobs/:job` | Run any scheduled job now |

## Cron

`GET /api/cron/:job` with `Authorization: Bearer $CRON_SECRET`. Jobs: `invariants`, `balance-cache`, `pass-owners`, `payout-cutoff`, `payout-settle`, `raffle-close`, `chain-lag`.

## Error codes

`PASS_MOVED`, `SLOT_BROKEN`, `SESSION_ALREADY_STARTED`, `POOL_EXHAUSTED`, `INSUFFICIENT_BALANCE`, `MAINTENANCE`, `RATE_LIMITED`, `NO_ACTIVE_SESSION`, `SLOT_MINING`, `MAX_LEVEL`, `REPAIR_NOT_NEEDED`, `REPAIR_IN_PROGRESS`, `ALREADY_CLAIMED`, `NO_PASS`, `PASS_INACTIVE`, `ACCOUNT_FROZEN`, `INVALID_CLAIM`, `INVALID_ADDRESS`, `WALLET_ALREADY_LINKED`, `ADDRESS_TAKEN`, `RAFFLE_CLOSED`, `RAFFLE_NOT_READY`, `BATCH_STATE`, `IDEMPOTENCY_KEY_REQUIRED`, `TURNSTILE_FAILED`, `BAD_ORIGIN`, `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`.
