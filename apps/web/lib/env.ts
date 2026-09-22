import "server-only";
import type { ZcashNetwork } from "@zecminers/zcash";

const isProd = process.env.NODE_ENV === "production";

function list(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Server configuration. Everything secret comes from env (Vercel / Doppler / 1Password). */
export const serverEnv = {
  isProd,
  network: (process.env.ZCASH_NETWORK === "testnet" ? "testnet" : "mainnet") as ZcashNetwork,
  chainMode: (process.env.ZORD_MODE === "live" ? "live" : "mock") as "mock" | "live",
  get claimCodePepper(): string {
    const v = process.env.CLAIM_CODE_PEPPER;
    if (v && v.length >= 16) return v;
    if (isProd) throw new Error("CLAIM_CODE_PEPPER must be set (≥16 chars) in production");
    return "dev-only-pepper-change-me-please";
  },
  maxPassesPerAccount: Number(process.env.MAX_PASSES_PER_ACCOUNT ?? 1),
  minDiscordAccountAgeDays: Number(process.env.MIN_DISCORD_ACCOUNT_AGE_DAYS ?? 30),
  adminDiscordIds: list(process.env.ADMIN_DISCORD_IDS),
  adminIpAllowlist: list(process.env.ADMIN_IP_ALLOWLIST),
  devLogin: process.env.AUTH_DEV_LOGIN === "true" && !isProd,
  /** Team login for /admin while Discord is off. Needs ≥ 24 characters to be enabled. */
  adminAccessKey: (process.env.ADMIN_ACCESS_KEY ?? "").length >= 24 ? (process.env.ADMIN_ACCESS_KEY as string) : "",
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? "",
  redisUrl: process.env.REDIS_URL ?? process.env.KV_URL ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  appOrigins: list(process.env.APP_ORIGINS ?? process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL),
};

export const discordEnabled = !!(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
