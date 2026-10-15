# Deployment: Vercel + Neon

The web app and API run on Vercel. The ledger database is Neon Postgres; the gameplay clips ship with the app. The chain server (Zebra + Zord) and the payout signer are **not** on Vercel. They run on their own hosts (blueprint §11.2).

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

Production builds (`VERCEL_ENV=production`) apply pending migrations before `next build` (`apps/web/scripts/migrate-on-deploy.mjs`, using `DATABASE_URL_UNPOOLED` when set); preview builds never touch the database. `/api/health` reports whether the schema is current. Generate new migrations with `pnpm db:generate`.

## 3. Media

The gameplay clips (≈2 MB) and their posters ship with the app in `apps/web/public/media` and deploy with every build — there is nothing to upload. If an older deployment still has `NEXT_PUBLIC_MEDIA_BASE_URL` / `BLOB_READ_WRITE_TOKEN` set, they are no longer read and can be removed.

## 4. Environment variables

Set these in Project → Settings → Environment Variables. See `.env.example` for the full list.

| Variable | Notes |
|---|---|
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_URL` | `https://your-domain` |
| `ADMIN_ACCESS_KEY` | ≥ 24 random characters. Enables **Team login** on `/play` → `/admin` |
| `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` | Optional. Discord login appears once both are set. Redirect: `https://your-domain/api/auth/callback/discord` |
| `ADMIN_DISCORD_IDS` | Optional. Comma-separated Discord user ids with admin rights |
| `ADMIN_IP_ALLOWLIST` | Optional. Recommended for production (§9.2) |
| `CLAIM_CODE_PEPPER` | ≥ 16 random characters. **Never change it after importing passes**, or the existing claim codes stop working |
| `CRON_SECRET` | Random string. The scheduled-jobs workflow sends it as a Bearer token (same value as the GitHub secret) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile |
| `REDIS_URL` | Upstash Redis (Vercel Marketplace) for rate limits. Without it, limits are per instance |
| `ZORD_MODE` | `mock` until the chain server is live, then `live` |
| `ZORD_API_URL`, `ZEBRA_RPC_URL/USER/PASSWORD` | Private endpoints of the chain server (reachable from Vercel only via a secure tunnel or allow-listed proxy) |
| `ALERT_DISCORD_WEBHOOK_URL` / `ALERT_TELEGRAM_*` | Alerts for invariant failures, held batches and indexer lag |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata and the sitemap |

`AUTH_DEV_LOGIN` is ignored in production builds.

**Sign-in.** Players sign in to Valley HQ (`/play`) with the address their pass is registered to plus its claim code — the same two columns as the team-logins CSV (`pnpm --filter @hoodvalley/db team-logins`). The first sign-in creates the account, links the address and opens its Valley Miner; after that the claim code is the player's password. A leaked code can't redirect tokens (payouts only go to the origin address), but it would let someone spend that player's in-game balance, so tell winners to keep it private. Discord login can be switched on later without code changes.

**Upgrading a ZecMiners deployment to Hood Valley.** Run `pnpm db:migrate` (adds shift weights, gear-up and `shift_days`, and the new pool accounts) and then `pnpm db:seed`. The seed moves an already-posted 80/10/5/5 genesis into the 70/15/8/5/2 pools in one ledger transaction, carrying over whatever the old pools already paid out. Existing passes, claim codes and test logins keep working unchanged.

**The Claim Office.** `/` shows the Claim Office until a visitor files a claim (Valley HQ players and the team skip it); the litepaper is public. For verified X sign-in, create an app at developer.x.com: OAuth 2.0, type "Web App", callback `https://<your-domain>/api/waitlist/x/callback` (and the `*.vercel.app` one if you use it), then set `AUTH_TWITTER_ID` and `AUTH_TWITTER_SECRET`. Without them step 1 asks for the X handle instead. To verify Discord membership, add the redirect `https://<your-domain>/api/waitlist/discord/callback` to a Discord application (scopes `identify guilds`), and set `DISCORD_GUILD_ID` (Server Settings → Widget, or Developer Mode → Copy Server ID) with `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — or reuse the Valley HQ login app's `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET`. Without it the Discord stamp is a click-through. The Follow / Repost / Quote / Discord tasks come from Admin → Claim Office (or `NEXT_PUBLIC_X_HANDLE`, `NEXT_PUBLIC_X_LAUNCH_TWEET`, `NEXT_PUBLIC_DISCORD_URL`), and the same panel exports the allowlist CSV.

**Season 1 clock.** The economy config sets the window (`shiftOpenHourUtc`, `shiftHours`), the daily pool (`dailyPool`, 38,888,889) and `seasonStart`. While `seasonStart` is null, Season 1 starts on the day the genesis ledger transaction is posted; deploying is refused until then with a clear message.

## 5. Scheduled jobs

Vercel Cron on the **Hobby** plan runs at most once a day, but reserve checks need to run every 5 minutes. So the schedule lives in **GitHub Actions** (`.github/workflows/scheduled-jobs.yml`), which calls `/api/cron/<job>` with `Authorization: Bearer $CRON_SECRET`:

| Schedule (UTC) | Jobs |
|---|---|
| every 5 min | `invariants`, `payout-settle`, `raffle-close`, `chain-lag` |
| hourly :07 | `balance-cache` |
| hourly :17 | `pass-owners` |
| Monday 00:00 | `payout-cutoff` |

Setup, once, in GitHub → Settings → Secrets and variables → Actions:

- **Secret** `CRON_SECRET`: the same value as in Vercel
- **Variable** `SITE_URL`: `https://your-domain`

Any job can also be run by hand from the Actions tab (Run workflow). Every job is idempotent, so a delayed or repeated run is harmless.

Notes:

- Scheduled workflows are free on public repos. A private repo would use about 8,600 Actions minutes a month at this rate; switch to every 15 minutes if you make it private.
- GitHub pauses schedules in a repo with no activity for 60 days. Any commit re-enables them.
- On **Vercel Pro** you can use Vercel Cron instead: add a `crons` array to `apps/web/vercel.json` and delete the workflow.
- On a VPS you can use the pg-boss worker (`apps/worker`) instead.

Run only one scheduler. If you change the payout weekday in the economy config (`payout.weekday`), change the cutoff schedule too.

## 6. Chain server and signer (off Vercel)

- `infra/chain/docker-compose.yml`: Zebra + Zord on a dedicated VPS, with RPC and API reachable only over WireGuard.
- `infra/signer/Dockerfile`: the signer on its own host with no inbound ports. It only connects out to Postgres (`SIGNER_DATABASE_URL`, preferably a dedicated DB role limited to `payout_items`, `payout_batches` and `system_flags`). See [SIGNER.md](SIGNER.md).

## 7. Before announcing

Work through blueprint §12.2. The key items: Zord shows the treasury holding 10,000,000,000 VALLEY; three test passes are sent and the moved one stops mining; payouts are tested end-to-end on testnet plus three small mainnet payouts; the external security review is done; and maintenance mode takes effect in under 5 s.
