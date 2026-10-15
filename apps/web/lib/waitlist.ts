import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getGateConfig, getWaitlistEntry, type Database, type GateTweet, type WaitlistEntry, type WaitlistGateConfig } from "@hoodvalley/db";
import { cookies } from "next/headers";
import { auth } from "@/auth";

/**
 * The Claim Office in front of the public site. Visitors connect X, collect a stamp for each
 * social task and the Discord, consent and file their claim; then the Field Journal (the full
 * site) opens. The wallet is linked after filing. Progress lives in `waitlist_entries`; the
 * browser keeps a signed cookie with the entry id.
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

// ------------------------------------------------------------------ OAuth

export const xOAuthEnabled = !!(process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET);

/**
 * Discord membership is verified by OAuth (scopes identify + guilds) when a Discord app and the
 * server id are configured; otherwise the Discord step is a click-through like the X tasks.
 * The waitlist can use its own Discord app or share the Valley HQ login app.
 */
export const discordGate = {
  clientId: process.env.DISCORD_CLIENT_ID || process.env.AUTH_DISCORD_ID || "",
  clientSecret: process.env.DISCORD_CLIENT_SECRET || process.env.AUTH_DISCORD_SECRET || "",
  guildId: process.env.DISCORD_GUILD_ID ?? "",
};
export const discordOAuthEnabled = !!(discordGate.clientId && discordGate.clientSecret && discordGate.guildId);

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
    tweets: launch
      ? [
          { id: "launch", kind: "retweet", label: "Repost the launch post", url: launch },
          { id: "quote", kind: "quote", label: "Quote the launch post", url: launch, text: "Staking my claim in Hood Valley ⛏️" },
        ]
      : [
          {
            id: "launch",
            kind: "post",
            label: "Post about Hood Valley",
            url: "",
            text: `Staking my claim in Hood Valley ⛏️ 3,333 Valley Miners, one 12-hour shift a day on Robinhood Chain.${SITE ? ` ${SITE}` : ""}`,
          },
        ],
  };
}

export function loadGateConfig(db: Database) {
  return getGateConfig(db, defaultGateConfig());
}

/** Public links for the site: the configured X account and Discord invite. */
export function socialLinks(config: WaitlistGateConfig): { x: string | null; discord: string | null } {
  return {
    x: process.env.NEXT_PUBLIC_X_URL || (config.xHandle ? `https://x.com/${config.xHandle}` : null),
    discord: config.discordInvite || process.env.NEXT_PUBLIC_DISCORD_URL || null,
  };
}

// ------------------------------------------------------------------ tasks

/** A social stamp on the permit (follow / repost / quote …): opens X, recorded from the click. */
export interface ClaimTask {
  key: string;
  title: string;
  sub: string;
  btn: string;
  /** Short name printed on the stamp. */
  stamp: string;
  url: string;
  done: boolean;
}

export interface ClaimDiscord {
  invite: string;
  /** Membership is checked through Discord sign-in rather than a click. */
  oauth: boolean;
  linked: boolean;
  member: boolean;
  username: string | null;
  /** Self-attested join (click-through mode). */
  marked: boolean;
}

/** Everything the Claim Office renders, from the visitor's entry and the current config. */
export interface ClaimView {
  screen: "gate" | "tasks" | "filed";
  xOAuth: boolean;
  /** "@handle" once X is connected. */
  who: string | null;
  xVerified: boolean;
  social: ClaimTask[];
  discord: ClaimDiscord | null;
  /** The route on the gate screen: CONNECT X, FOLLOW, REPOST, … */
  route: string[];
  consent: boolean;
  wallet: string | null;
  memberNo: number | null;
}

const KIND_COPY: Record<GateTweet["kind"], { sub: string; btn: string; stamp: string }> = {
  retweet: { sub: "Spread the word to the crew.", btn: "REPOST ↗", stamp: "REPOST" },
  like: { sub: "Show the launch post some love.", btn: "LIKE ↗", stamp: "LIKE" },
  quote: { sub: "Tell the valley why you're mining.", btn: "QUOTE ↗", stamp: "QUOTE" },
  reply: { sub: "Drop your reply in the thread.", btn: "REPLY ↗", stamp: "REPLY" },
  post: { sub: "Tell your timeline you're clocking in.", btn: "POST ↗", stamp: "POST" },
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

/** The click-through tasks the current config asks for (the server checks these at filing). */
export function requiredTaskKeys(config: WaitlistGateConfig): string[] {
  return [
    ...(config.xHandle ? ["follow"] : []),
    ...config.tweets.map((t) => `tweet:${t.id}`),
    ...(config.discordInvite && !discordOAuthEnabled ? ["discord"] : []),
  ];
}

/** Filing needs Discord membership confirmed by Discord itself when that check is configured. */
export function requiresDiscordMember(config: WaitlistGateConfig): boolean {
  return !!config.discordInvite && discordOAuthEnabled;
}

export function claimView(entry: WaitlistEntry | null, config: WaitlistGateConfig): ClaimView {
  const marked = (key: string) => !!entry?.tasks[key];
  const name = entry?.xUsername ?? entry?.handle ?? null;
  const identified = !!entry?.xVerifiedAt || (!xOAuthEnabled && !!entry?.handle);
  const social: ClaimTask[] = [];
  if (config.xHandle) {
    social.push({
      key: "follow",
      title: `Follow @${config.xHandle} on X`,
      sub: "Stay close to mint announcements.",
      btn: "FOLLOW ↗",
      stamp: "FOLLOW",
      url: `https://x.com/intent/follow?screen_name=${config.xHandle}`,
      done: marked("follow"),
    });
  }
  for (const t of config.tweets) {
    const copy = KIND_COPY[t.kind];
    social.push({ key: `tweet:${t.id}`, title: t.label, sub: copy.sub, btn: copy.btn, stamp: copy.stamp, url: tweetIntent(t), done: marked(`tweet:${t.id}`) });
  }
  const discord: ClaimDiscord | null = config.discordInvite
    ? {
        invite: config.discordInvite,
        oauth: discordOAuthEnabled,
        linked: !!entry?.discordVerifiedAt,
        member: !!entry?.discordMemberAt,
        username: entry?.discordUsername ?? null,
        marked: marked("discord"),
      }
    : null;
  return {
    screen: entry?.unlockedAt ? "filed" : identified ? "tasks" : "gate",
    xOAuth: xOAuthEnabled,
    who: identified && name ? `@${name}` : null,
    xVerified: !!entry?.xVerifiedAt,
    social,
    discord,
    route: ["CONNECT X", ...social.map((t) => t.stamp), ...(discord ? ["DISCORD"] : [])],
    consent: !!entry?.consentAt,
    wallet: entry?.wallet ?? null,
    memberNo: entry?.memberNo ?? null,
  };
}

// ------------------------------------------------------------------ access

/** The visitor's waitlist entry, from the signed cookie. */
export async function currentGateEntry(db: Database): Promise<WaitlistEntry | null> {
  const id = verifyGateValue((await cookies()).get(GATE_COOKIE)?.value);
  return id ? getWaitlistEntry(db, id) : null;
}

/**
 * Who sees the full site: anyone who filed a claim, plus signed-in Valley HQ players and the team
 * (they already hold a pass or the admin key).
 */
export async function siteAccess(db: Database): Promise<{ open: boolean; entry: WaitlistEntry | null }> {
  const entry = await currentGateEntry(db);
  if (entry?.unlockedAt) return { open: true, entry };
  const session = await auth();
  return { open: !!session?.user?.id, entry };
}

// ------------------------------------------------------------------ notices

const X_NOTICES: Record<string, string> = {
  cancelled: "X sign-in was cancelled. Connect X to begin.",
  expired: "That sign-in took too long. Try again.",
  error: "X didn't answer. Try again in a moment.",
  unavailable: "X sign-in isn't switched on yet.",
};

const DISCORD_NOTICES: Record<string, string> = {
  missing: "Discord connected, but you're not in the server yet. Join with the button above, then confirm.",
  taken: "That Discord account is already on another permit.",
  cancelled: "Discord sign-in was cancelled.",
  expired: "That Discord sign-in took too long. Try again.",
  error: "Discord didn't answer. Try again in a moment.",
  unavailable: "The Discord check isn't switched on yet.",
};

/** Messages for the OAuth round-trips (`?x=…`, `?discord=…`). Unknown values show nothing. */
export function claimNotices(q: { x?: string | string[]; discord?: string | string[] }): { x: string | null; discord: string | null } {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return { x: X_NOTICES[one(q.x)] ?? null, discord: DISCORD_NOTICES[one(q.discord)] ?? null };
}
