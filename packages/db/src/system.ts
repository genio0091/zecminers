import { DEV_ECONOMY_PARAMS, parseEconomyParams, type EconomyParams, type FreezeWindow } from "@zecminers/economy";
import { desc, eq, lte } from "drizzle-orm";
import type { DbOrTx } from "./client";
import { adminAuditLog, alerts, chainRegistry, economyConfig, systemFlags } from "./schema";

// ---------- system flags ----------

export type FlagKey = "maintenance" | "mining_halted" | "freeze_windows" | "nu7_activation_height";

export interface MaintenanceFlag {
  on: boolean;
  reason: string;
  since: string;
}

export async function getFlag<T>(db: DbOrTx, key: FlagKey): Promise<T | null> {
  const [row] = await db.select().from(systemFlags).where(eq(systemFlags.key, key)).limit(1);
  return (row?.value as T) ?? null;
}

export async function setFlag(db: DbOrTx, key: FlagKey, value: unknown, updatedBy: string) {
  await db
    .insert(systemFlags)
    .values({ key, value, updatedBy })
    .onConflictDoUpdate({ target: systemFlags.key, set: { value, updatedBy, updatedAt: new Date() } });
}

export async function getMaintenance(db: DbOrTx): Promise<MaintenanceFlag> {
  return (await getFlag<MaintenanceFlag>(db, "maintenance")) ?? { on: false, reason: "", since: "" };
}

export async function setMaintenance(db: DbOrTx, on: boolean, reason: string, by: string) {
  await setFlag(db, "maintenance", { on, reason, since: new Date().toISOString() } satisfies MaintenanceFlag, by);
}

export async function isMiningHalted(db: DbOrTx): Promise<boolean> {
  return (await getFlag<{ on: boolean }>(db, "mining_halted"))?.on === true;
}

export async function getFreezeWindows(db: DbOrTx): Promise<FreezeWindow[]> {
  return (await getFlag<FreezeWindow[]>(db, "freeze_windows")) ?? [];
}

export async function getNu7ActivationHeight(db: DbOrTx): Promise<number | null> {
  const v = await getFlag<number>(db, "nu7_activation_height");
  return typeof v === "number" ? v : null;
}

// ---------- economy config (versioned, never overwritten) ----------

export interface ActiveConfig {
  version: number;
  params: EconomyParams;
  activeFrom: Date;
}

export async function getActiveConfig(db: DbOrTx, at: Date = new Date()): Promise<ActiveConfig> {
  const [row] = await db
    .select()
    .from(economyConfig)
    .where(lte(economyConfig.activeFrom, at))
    .orderBy(desc(economyConfig.activeFrom), desc(economyConfig.version))
    .limit(1);
  if (!row) return { version: 0, params: DEV_ECONOMY_PARAMS, activeFrom: new Date(0) };
  return { version: row.version, params: parseEconomyParams(row.params), activeFrom: row.activeFrom };
}

export async function getConfigVersion(db: DbOrTx, version: number): Promise<EconomyParams> {
  if (version === 0) return DEV_ECONOMY_PARAMS;
  const [row] = await db.select().from(economyConfig).where(eq(economyConfig.version, version)).limit(1);
  if (!row) throw new Error(`economy config v${version} not found`);
  return parseEconomyParams(row.params);
}

export async function publishConfig(
  db: DbOrTx,
  params: unknown,
  opts: { activeFrom?: Date; createdBy: string; note?: string },
): Promise<number> {
  const parsed = parseEconomyParams(params);
  const [row] = await db
    .insert(economyConfig)
    .values({ params: parsed, activeFrom: opts.activeFrom ?? new Date(), createdBy: opts.createdBy, note: opts.note })
    .returning({ version: economyConfig.version });
  return row!.version;
}

// ---------- chain registry (blueprint §6.5) ----------

export const REGISTRY_KEYS = [
  "token_tick",
  "token_deploy_txid",
  "token_mint_txid",
  "token_inscription_id",
  "token_deploy_height",
  "token_mint_outpoint",
  "treasury_address",
  "hot_wallet_address",
  "pass_collection",
  "pass_collection_inscription_id",
  "pass_collection_deploy_txid",
  "pass_supply",
  "explorer_base_url",
] as const;
export type RegistryKey = (typeof REGISTRY_KEYS)[number];

export async function getRegistry(db: DbOrTx): Promise<Partial<Record<RegistryKey, string>>> {
  const rows = await db.select().from(chainRegistry);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Record<RegistryKey, string>>;
}

export async function setRegistry(db: DbOrTx, key: RegistryKey, value: string) {
  await db
    .insert(chainRegistry)
    .values({ key, value })
    .onConflictDoUpdate({ target: chainRegistry.key, set: { value, updatedAt: new Date() } });
}

// ---------- audit + alerts ----------

export async function audit(
  db: DbOrTx,
  entry: { adminId: string; action: string; payload: Record<string, unknown>; reason: string },
) {
  await db.insert(adminAuditLog).values(entry);
}

export type AlertLevel = "info" | "medium" | "high" | "critical";

/**
 * Stores the alert and, for high/critical, pushes it to Discord/Telegram (blueprint §11.3).
 * Delivery failures never break the caller.
 */
export async function recordAlert(db: DbOrTx, level: AlertLevel, kind: string, message: string) {
  await db.insert(alerts).values({ level, kind, message });
  if (level === "high" || level === "critical") void pushAlert(level, kind, message);
}

async function pushAlert(level: AlertLevel, kind: string, message: string) {
  const text = `[ZecMiners ${level.toUpperCase()}] ${kind}: ${message}`;
  const tasks: Promise<unknown>[] = [];
  const discord = process.env.ALERT_DISCORD_WEBHOOK_URL;
  if (discord) {
    tasks.push(fetch(discord, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) }));
  }
  const tgToken = process.env.ALERT_TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.ALERT_TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    tasks.push(
      fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: tgChat, text }),
      }),
    );
  }
  await Promise.allSettled(tasks);
}

export async function recentAlerts(db: DbOrTx, limit = 20) {
  return db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(limit);
}

export async function recentAudit(db: DbOrTx, limit = 20, action?: string) {
  return db
    .select()
    .from(adminAuditLog)
    .where(action ? eq(adminAuditLog.action, action) : undefined)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
}
