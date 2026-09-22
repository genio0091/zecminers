# Deployment: Vercel + Neon + Vercel Blob

The web app and API run on Vercel. The ledger database is Neon Postgres, and the gameplay clips are served from Vercel Blob. The chain server (Zebra + Zord) and the payout signer are **not** on Vercel. They run on their own hosts (blueprint §11.2).

## 1. Vercel project

1. Import `genio0091/zecminers` in Vercel.
2. **Root Directory:** `apps/web`. Vercel detects the pnpm workspace and installs from the repo root.
3. Framework preset: Next.js. Keep the defaults (`pnpm install`, `next build`).
4. Region: `vercel.json` pins functions to **`sin1` (Singapore)**, close to players in Indonesia (blueprint §11.2). Create the Neon database in **AWS ap-southeast-1 (Singapore)** too.

## 2. Neon (Postgres)

1. Vercel → Storage → **Create → Neon** and connect it to the project, for all environments you need. The integration sets `DATABASE_URL` (pooled, `-pooler`) and `DATABASE_URL_UNPOOLED` (direct), among others.
2. The app uses `DATABASE_URL` with a small pool (`DB_POOL_MAX`, default 3 on Vercel).
3. **Push every table** from your machine or CI, using the *unpooled* URL:

   ```bash
   vercel env pull apps/web/.env.production.local --environment=production   # or copy the values from the dashboard
   export $(grep -E '^(DATABASE_URL|DATABASE_URL_UNPOOLED)=' apps/web/.env.production.local | xargs)
   pnpm db:migrate     # applies packages/db/drizzle/*.sql — 21 tables + append-only triggers
   pnpm db:seed        # system ledger accounts, economy config v1, NU7 freeze window (no demo data)
   ```

   `pnpm db:seed -- --dev` refuses to run against production.
4. Turn on point-in-time restore (Neon keeps history per plan). Also schedule `infra/backup/backup.sh` for the encrypted daily dump the blueprint asks for (§11.4).

Migrations are never run automatically on deploy. Run `pnpm db:migrate` whenever `packages/db/drizzle` changes. Generate new migrations with `pnpm db:generate`.

## 3. Vercel Blob (media)

1. Vercel → Storage → **Create → Blob** and connect it. This sets `BLOB_READ_WRITE_TOKEN`.
2. Upload the seven clips:

   ```bash
   BLOB_READ_WRITE_TOKEN=… pnpm --filter @zecminers/web media:upload
   ```

3. Set the printed `NEXT_PUBLIC_MEDIA_BASE_URL=https://<store>.public.blob.vercel-storage.com/media` and redeploy. The CSP automatically allows that origin for `media-src`. Posters always ship with the app.

Until you do this, the clips are served from `apps/web/public/media` (≈34 MB), which also works.

## 4. Environment variables

Set these in Project → Settings → Environment Variables. See `.env.example` for the full list.

| Variable | Notes |
|---|---|
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_URL` | `https://your-domain` |
| `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` | Discord Developer Portal → OAuth2. Redirect: `https://your-domain/api/auth/callback/discord` |
| `ADMIN_DISCORD_IDS` | Comma-separated Discord user ids with admin rights |
| `ADMIN_IP_ALLOWLIST` | Optional. Recommended for production (§9.2) |
| `CLAIM_CODE_PEPPER` | ≥ 16 random characters. **Never change it after importing passes**, or the existing claim codes stop working |
| `CRON_SECRET` | Random string. Vercel Cron sends it as a Bearer token |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile |
| `REDIS_URL` | Upstash Redis (Vercel Marketplace) for rate limits. Without it, limits are per instance |
| `ZORD_MODE` | `mock` until the chain server is live, then `live` |
| `ZORD_API_URL`, `ZEBRA_RPC_URL/USER/PASSWORD` | Private endpoints of the chain server (reachable from Vercel only via a secure tunnel or allow-listed proxy) |
| `ALERT_DISCORD_WEBHOOK_URL` / `ALERT_TELEGRAM_*` | Alerts for invariant failures, held batches and indexer lag |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata and the sitemap |

`AUTH_DEV_LOGIN` is ignored in production builds.

## 5. Scheduled jobs

`apps/web/vercel.json` registers Vercel Cron for every job (reserve checks every 5 min, the pass-owner check hourly, and the payout cutoff Mondays 00:00 UTC, among others). Crons more frequent than daily need a **Vercel Pro** plan. On Hobby, run the pg-boss worker (`apps/worker`) on a small VPS instead, and delete the `crons` block. Don't run both.

The payout cutoff weekday lives in the economy config (`payout.weekday`). If you change it, also change the cron (`vercel.json` or `CRON_PAYOUT_CUTOFF` for the worker).

## 6. Chain server and signer (off Vercel)

- `infra/chain/docker-compose.yml`: Zebra + Zord on a dedicated VPS, with RPC and API reachable only over WireGuard.
- `infra/signer/Dockerfile`: the signer on its own host with no inbound ports. It only connects out to Postgres (`SIGNER_DATABASE_URL`, preferably a dedicated DB role limited to `payout_items`, `payout_batches` and `system_flags`). See [SIGNER.md](SIGNER.md).

## 7. Before announcing

Work through blueprint §12.2. The key items: Zord shows the treasury holding 10,000,000,000 ZGEMS; three test passes are sent and the moved one stops mining; payouts are tested end-to-end on testnet plus three small mainnet payouts; the external security review is done; and maintenance mode takes effect in under 5 s.
