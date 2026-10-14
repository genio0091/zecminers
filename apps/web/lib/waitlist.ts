import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getGateConfig, getWaitlistEntry, type Database, type GateTweet, type WaitlistEntry, type WaitlistGateConfig } from "@hoodvalley/db";
import { cookies } from "next/headers";
import { auth } from "@/auth";

/**
 * The waitlist gate in front of the public site. Visitors connect X, do the social tasks, add a
 * Robinhood Chain wallet and consent; then the full site opens. Progress lives in
 * `waitlist_entries`; the browser keeps a signed cookie with the entry id.
 */

export const GATE_COOKIE = "hv_gate";
const YEAR = 365 * 24 * 3600;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set");
  return "dev-only-gate-secret";
}

const mac = (value: string) => createHmac("sha256", secret()).update(`hv-gate:${value}`).digest("base64url");

export function signGateValue(value: string): string {
  return `${value}.${mac(value)}`;
}

export function verifyGateValue(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const value = raw.slice(0, i);
  const a = Buffer.from(raw.slice(i + 1));
  const b = Buffer.from(mac(value));
  return a.length === b.length && timingSafeEqual(a, b) ? value : null;
}

export const gateCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR };

// ------------------------------------------------------------------ X OAuth

export const xOAuthEnabled = !!(process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET);

// ------------------------------------------------------------------ config

function handleFromUrl(url: string | undefined): string {
  const m = url?.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?$/);
  return m?.[1] ?? "";
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** Deploy defaults (env); Admin → Waitlist gate overrides them without a redeploy. */
export function defaultGateConfig(): WaitlistGateConfig {
  const launch = process.env.NEXT_PUBLIC_X_LAUNCH_TWEET;
  return {
    xHandle: process.env.NEXT_PUBLIC_X_HANDLE?.replace(/^@/, "") || handleFromUrl(process.env.NEXT_PUBLIC_X_URL),
    discordInvite: process.env.NEXT_PUBLIC_DISCORD_URL ?? "",
    tweets: [
      launch
        ? { id: "launch", kind: "retweet", label: "Repost the launch announcement", url: launch }
        : {
            id: "launch",
            kind: "post",
            label: "Post about Hood Valley",
            url: "",
            text: `Joining the Hood Valley waitlist ⛏️ 3,333 Valley Miners, one 12-hour shift a day on Robinhood Chain.${SITE ? ` ${SITE}` : ""}`,
          },
    ],
  };
}

export function loadGateConfig(db: Database) {
  return getGateConfig(db, defaultGateConfig());
}

// ------------------------------------------------------------------ tasks

export type GateTaskKind = "connect_x" | "follow" | "tweet" | "discord" | "wallet";

export interface GateTask {
  key: string;
  kind: GateTaskKind;
  title: string;
  desc: string;
  /** Where the action button goes (X intent, Discord invite). */
  url?: string;
  action?: string;
  done: boolean;
  /** Proven by OAuth rather than a click-through. */
  verified: boolean;
}

const ACTION: Record<GateTweet["kind"], string> = { retweet: "Repost ↗", like: "Like ↗", quote: "Quote ↗", reply: "Reply ↗", post: "Post ↗" };
const DESC: Record<GateTweet["kind"], string> = {
  retweet: "Spread the word. Miners help miners.",
  like: "Show the launch post some love.",
  quote: "Tell the valley why you're clocking in.",
  reply: "Drop your reply in the thread.",
  post: "Tell your timeline you're clocking in.",
};

function tweetIntent(t: GateTweet): string {
  const id = t.url.match(/\/status\/(\d+)/)?.[1] ?? "";
  const text = t.text ? encodeURIComponent(t.text) : "";
  switch (t.kind) {
    case "retweet":
      return `https://x.com/intent/retweet?tweet_id=${id}`;
    case "like":
      return `https://x.com/intent/like?tweet_id=${id}`;
    case "quote":
      return `https://x.com/intent/post?text=${text}&url=${encodeURIComponent(t.url)}`;
    case "reply":
      return `https://x.com/intent/post?in_reply_to=${id}${text ? `&text=${text}` : ""}`;
    case "post":
      return `https://x.com/intent/post?text=${text}`;
  }
}

/** The self-attested tasks the current config asks for (the server checks these at unlock). */
export function requiredTaskKeys(config: WaitlistGateConfig): string[] {
  return [...(config.xHandle ? ["follow"] : []), ...config.tweets.map((t) => `tweet:${t.id}`), ...(config.discordInvite ? ["discord"] : [])];
}

export function gateTasks(entry: WaitlistEntry | null, config: WaitlistGateConfig): GateTask[] {
  const marked = (key: string) => !!entry?.tasks[key];
  const xDone = !!entry?.xVerifiedAt || (!xOAuthEnabled && !!entry?.handle);
  const tasks: GateTask[] = [
    {
      key: "connect_x",
      kind: "connect_x",
      title: "Connect your X account",
      desc: entry?.xVerifiedAt ? `Connected as @${entry.xUsername} · verified by X` : entry?.handle ? `@${entry.handle}` : "Sign in with X to verify you're a real miner.",
      done: xDone,
      verified: !!entry?.xVerifiedAt,
    },
  ];
  if (config.xHandle) {
    tasks.push({
      key: "follow",
      kind: "follow",
      title: `Follow @${config.xHandle}`,
      desc: "Stay close to mint announcements.",
      url: `https://x.com/intent/follow?screen_name=${config.xHandle}`,
      action: "Follow ↗",
      done: marked("follow"),
      verified: false,
    });
  }
  for (const t of config.tweets) {
    tasks.push({ key: `tweet:${t.id}`, kind: "tweet", title: t.label, desc: DESC[t.kind], url: tweetIntent(t), action: ACTION[t.kind], done: marked(`tweet:${t.id}`), verified: false });
  }
  if (config.discordInvite) {
    tasks.push({
      key: "discord",
      kind: "discord",
      title: "Join the Hood Valley Discord",
      desc: "The camp is where shift times and mint news drop first.",
      url: config.discordInvite,
      action: "Join ↗",
      done: marked("discord"),
      verified: false,
    });
  }
  tasks.push({
    key: "wallet",
    kind: "wallet",
    title: "Add your Robinhood Chain wallet",
    desc: entry?.wallet ? `${entry.wallet.slice(0, 6)}…${entry.wallet.slice(-4)} · the wallet we'll check at mint` : "The 0x address we'll check when mint details are confirmed.",
    done: !!entry?.wallet,
    verified: false,
  });
  return tasks;
}

// ------------------------------------------------------------------ access

/** The visitor's waitlist entry, from the signed cookie. */
export async function currentGateEntry(db: Database): Promise<WaitlistEntry | null> {
  const id = verifyGateValue((await cookies()).get(GATE_COOKIE)?.value);
  return id ? getWaitlistEntry(db, id) : null;
}

/**
 * Who sees the full site: anyone through the gate, plus signed-in Valley HQ players and the team
 * (they already hold a pass or the admin key).
 */
export async function siteAccess(db: Database): Promise<{ open: boolean; entry: WaitlistEntry | null }> {
  const entry = await currentGateEntry(db);
  if (entry?.unlockedAt) return { open: true, entry };
  const session = await auth();
  return { open: !!session?.user?.id, entry };
}
