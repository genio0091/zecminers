import { desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Database, DbOrTx } from "../client";
import { GameError, isUniqueViolation } from "../errors";
import { waitlistEntries } from "../schema";
import { audit, getFlag, setFlag } from "../system";

/**
 * The waitlist gate in front of the public site (connect X → social tasks → wallet → consent).
 * Entries are anonymous until X is connected; the browser holds a signed cookie with the id.
 */

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;

export type GateTweetKind = "retweet" | "like" | "quote" | "reply" | "post";

/** An admin-managed X task. `url` is the tweet (not needed for "post", which opens a new post). */
export interface GateTweet {
  id: string;
  kind: GateTweetKind;
  label: string;
  url: string;
  /** Prefilled text for quote / reply / post. */
  text?: string;
}

export interface WaitlistGateConfig {
  /** Project X handle, without @. */
  xHandle: string;
  discordInvite: string;
  tweets: GateTweet[];
}

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

export function normalizeXHandle(handle: string): string | null {
  const h = handle.trim().replace(/^@/, "");
  return HANDLE_RE.test(h) ? h : null;
}

/** Stored config, falling back field by field to the deploy's defaults (env). */
export async function getGateConfig(db: DbOrTx, defaults: WaitlistGateConfig): Promise<WaitlistGateConfig> {
  const stored = await getFlag<Partial<WaitlistGateConfig>>(db, "waitlist_gate");
  return {
    xHandle: stored?.xHandle || defaults.xHandle,
    discordInvite: stored?.discordInvite || defaults.discordInvite,
    tweets: stored?.tweets?.length ? stored.tweets : defaults.tweets,
  };
}

export async function setGateConfig(db: Database, p: { adminId: string; config: WaitlistGateConfig; reason: string }) {
  if (p.config.xHandle && !normalizeXHandle(p.config.xHandle)) throw new GameError("VALIDATION", "X handle: letters, numbers and _ only, up to 15.");
  const ids = new Set<string>();
  for (const t of p.config.tweets) {
    if (!/^[a-z0-9-]{1,32}$/.test(t.id) || ids.has(t.id)) throw new GameError("VALIDATION", `Tweet task id "${t.id}" must be unique (a-z, 0-9, -).`);
    ids.add(t.id);
    if (t.kind !== "post" && !/^https:\/\/(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+/.test(t.url)) {
      throw new GameError("VALIDATION", `Tweet task "${t.label}" needs a tweet URL like https://x.com/handle/status/123.`);
    }
  }
  return db.transaction(async (tx) => {
    await audit(tx, { adminId: p.adminId, action: "waitlist.config", payload: { ...p.config }, reason: p.reason });
    await setFlag(tx, "waitlist_gate", p.config, `admin:${p.adminId}`);
    return p.config;
  });
}

export async function getWaitlistEntry(db: DbOrTx, id: string): Promise<WaitlistEntry | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(waitlistEntries).where(eq(waitlistEntries.id, id)).limit(1);
  return row ?? null;
}

/** Step 1 without X OAuth: a self-reported handle starts (or updates) the entry. */
export async function startWithHandle(db: Database, p: { entryId: string | null; handle: string; now: Date }) {
  const handle = normalizeXHandle(p.handle);
  if (!handle) throw new GameError("VALIDATION", "Enter your X handle, like @yourhandle.");
  if (p.entryId) {
    const [row] = await db
      .update(waitlistEntries)
      .set({ handle, updatedAt: p.now })
      .where(eq(waitlistEntries.id, p.entryId))
      .returning();
    if (row) return row;
  }
  const [row] = await db.insert(waitlistEntries).values({ handle }).returning();
  return row!;
}

/**
 * Step 1 with X OAuth. An X account owns at most one entry: signing in again from another device
 * resumes that entry; otherwise X is attached to the visitor's current entry (or a new one).
 */
export async function connectX(db: Database, p: { entryId: string | null; xId: string; xUsername: string; now: Date }) {
  return db.transaction(async (tx) => {
    const [owned] = await tx.select().from(waitlistEntries).where(eq(waitlistEntries.xId, p.xId)).limit(1).for("update");
    if (owned) {
      const [row] = await tx
        .update(waitlistEntries)
        .set({ xUsername: p.xUsername, xVerifiedAt: p.now, updatedAt: p.now })
        .where(eq(waitlistEntries.id, owned.id))
        .returning();
      return row!;
    }
    if (p.entryId) {
      const [row] = await tx
        .update(waitlistEntries)
        .set({ xId: p.xId, xUsername: p.xUsername, xVerifiedAt: p.now, handle: p.xUsername, updatedAt: p.now })
        .where(sql`${waitlistEntries.id} = ${p.entryId} and ${waitlistEntries.xId} is null`)
        .returning();
      if (row) return row;
    }
    const [row] = await tx
      .insert(waitlistEntries)
      .values({ xId: p.xId, xUsername: p.xUsername, xVerifiedAt: p.now, handle: p.xUsername })
      .returning();
    return row!;
  });
}

/** Records a self-attested click-through. The caller checks the key against the current config. */
export async function markWaitlistTask(db: DbOrTx, p: { entryId: string; key: string; now: Date }) {
  const [row] = await db
    .update(waitlistEntries)
    .set({
      tasks: sql`${waitlistEntries.tasks} || jsonb_build_object(${p.key}::text, ${p.now.toISOString()}::text)`,
      updatedAt: p.now,
    })
    .where(eq(waitlistEntries.id, p.entryId))
    .returning();
  if (!row) throw new GameError("NOT_FOUND", "Start the waitlist again.");
  return row;
}

export async function setWaitlistWallet(db: DbOrTx, p: { entryId: string; wallet: string; now: Date }) {
  const wallet = p.wallet.trim();
  if (!WALLET_RE.test(wallet)) {
    throw new GameError("INVALID_ADDRESS", "That doesn't look like a wallet address. It should start with 0x followed by 40 characters.");
  }
  try {
    const [row] = await db
      .update(waitlistEntries)
      .set({ wallet: wallet.toLowerCase(), updatedAt: p.now })
      .where(sql`${waitlistEntries.id} = ${p.entryId} and ${waitlistEntries.unlockedAt} is null`)
      .returning();
    if (!row) throw new GameError("CONFLICT", "This entry is already on the list.");
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new GameError("ADDRESS_TAKEN", "That wallet is already on the waitlist.");
    throw err;
  }
}

export async function setWaitlistConsent(db: DbOrTx, p: { entryId: string; agreed: boolean; now: Date }) {
  const [row] = await db
    .update(waitlistEntries)
    .set({ consentAt: p.agreed ? p.now : null, updatedAt: p.now })
    .where(eq(waitlistEntries.id, p.entryId))
    .returning();
  if (!row) throw new GameError("NOT_FOUND", "Start the waitlist again.");
  return row;
}

/**
 * The gate check, done again on the server whatever the button said: identity, every required
 * task, a wallet and consent. Member numbers are dense: unlocks are serialised by a lock.
 */
export async function unlockWaitlistEntry(
  db: Database,
  p: { entryId: string; requiredTasks: string[]; requireXVerified: boolean; now: Date },
) {
  return db.transaction(async (tx) => {
    const [e] = await tx.select().from(waitlistEntries).where(eq(waitlistEntries.id, p.entryId)).limit(1).for("update");
    if (!e) throw new GameError("NOT_FOUND", "Start the waitlist again.");
    if (e.unlockedAt) return e;
    if (p.requireXVerified ? !e.xVerifiedAt : !(e.xVerifiedAt || e.handle)) throw new GameError("VALIDATION", "Connect your X account first.");
    const missing = p.requiredTasks.filter((k) => !e.tasks[k]);
    if (missing.length) throw new GameError("VALIDATION", "Finish every task first.", { missing });
    if (!e.wallet) throw new GameError("VALIDATION", "Add your Robinhood Chain wallet first.");
    if (!e.consentAt) throw new GameError("VALIDATION", "Tick the consent box to continue.");
    await tx.execute(sql`select pg_advisory_xact_lock(333300)`);
    const [{ max } = { max: 0 }] = await tx.select({ max: sql<number>`coalesce(max(${waitlistEntries.memberNo}), 0)::int` }).from(waitlistEntries);
    const [row] = await tx
      .update(waitlistEntries)
      .set({ unlockedAt: p.now, memberNo: Number(max) + 1, updatedAt: p.now })
      .where(eq(waitlistEntries.id, e.id))
      .returning();
    return row!;
  });
}

export async function waitlistStats(db: DbOrTx) {
  const [row] = await db
    .select({
      entries: sql<number>`count(*)::int`,
      xVerified: sql<number>`count(${waitlistEntries.xVerifiedAt})::int`,
      withWallet: sql<number>`count(${waitlistEntries.wallet})::int`,
      unlocked: sql<number>`count(${waitlistEntries.unlockedAt})::int`,
    })
    .from(waitlistEntries);
  return { entries: Number(row?.entries ?? 0), xVerified: Number(row?.xVerified ?? 0), withWallet: Number(row?.withWallet ?? 0), unlocked: Number(row?.unlocked ?? 0) };
}

/** Everyone who made it through the gate, in line order. */
export async function listUnlockedWaitlist(db: DbOrTx) {
  return db
    .select({
      memberNo: waitlistEntries.memberNo,
      xUsername: waitlistEntries.xUsername,
      handle: waitlistEntries.handle,
      xVerified: isNotNull(waitlistEntries.xVerifiedAt),
      wallet: waitlistEntries.wallet,
      tasks: waitlistEntries.tasks,
      unlockedAt: waitlistEntries.unlockedAt,
    })
    .from(waitlistEntries)
    .where(isNotNull(waitlistEntries.unlockedAt))
    .orderBy(waitlistEntries.memberNo);
}

export async function recentWaitlist(db: DbOrTx, limit = 10) {
  return db.select().from(waitlistEntries).orderBy(desc(waitlistEntries.updatedAt)).limit(limit);
}
