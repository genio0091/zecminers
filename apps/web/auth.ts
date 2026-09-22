import { createHash, timingSafeEqual } from "node:crypto";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import { GameError, getDb, tables, walletSignIn } from "@zecminers/db";
import { discordEnabled, serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "user" | "admin" } & DefaultSession["user"];
  }
}

/** Discord ids are snowflakes: the top bits are ms since 2015-01-01. */
export function discordCreatedAt(id: string): Date | null {
  if (!/^\d{15,20}$/.test(id)) return null;
  return new Date(Number((BigInt(id) >> 22n) + 1_420_070_400_000n));
}

async function upsertUser(discordId: string, username: string | null, forceAdmin = false) {
  const db = getDb();
  const role = forceAdmin || serverEnv.adminDiscordIds.includes(discordId) ? "admin" : undefined;
  const [row] = await db
    .insert(tables.users)
    .values({ discordId, discordUsername: username, discordCreatedAt: discordCreatedAt(discordId), ...(role ? { role } : {}) })
    .onConflictDoUpdate({
      target: tables.users.discordId,
      set: { discordUsername: username, ...(role ? { role } : {}) },
    })
    .returning({ id: tables.users.id, role: tables.users.role });
  return row!;
}

/** Sign-in failures carry a short code that the sign-in page turns into a message. */
class LoginError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

function requestIp(req: Request | undefined): string {
  return req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req?.headers.get("x-real-ip") ?? "unknown";
}

async function limit(name: string, key: string, max: number, windowSec: number) {
  const r = await rateLimit(`${name}:${key}`, max, windowSec);
  if (!r.ok) throw new LoginError("rate_limited");
}

const sha256 = (v: string) => createHash("sha256").update(v).digest();

const providers = [];

/**
 * Wallet sign-in: t1 address + the pass claim code. This is the player login while Discord is
 * off (Discord comes back automatically once AUTH_DISCORD_ID/SECRET are set).
 */
providers.push(
  Credentials({
    id: "wallet",
    name: "Wallet",
    credentials: { address: { label: "Address", type: "text" }, code: { label: "Claim code", type: "password" } },
    async authorize(creds, req) {
      const address = String(creds?.address ?? "").trim();
      const code = String(creds?.code ?? "").trim();
      if (!address || !code) throw new LoginError("missing");
      await limit("login-wallet:ip", requestIp(req), 10, 600);
      await limit("login-wallet:addr", address, 10, 600);
      try {
        const r = await walletSignIn(getDb(), {
          address,
          claimCode: code,
          pepper: serverEnv.claimCodePepper,
          network: serverEnv.network,
          now: new Date(),
        });
        return { id: r.userId, name: `${address.slice(0, 6)}…${address.slice(-4)}`, role: r.role };
      } catch (err) {
        if (err instanceof GameError) {
          const map: Record<string, string> = {
            INVALID_ADDRESS: "invalid_address",
            NO_PASS: "no_pass",
            INVALID_CLAIM: "invalid_code",
            ACCOUNT_FROZEN: "frozen",
          };
          throw new LoginError(map[err.code] ?? "invalid_code");
        }
        throw err;
      }
    },
  }),
);

/** Team login for the admin panel, with ADMIN_ACCESS_KEY from the Vercel env. */
if (serverEnv.adminAccessKey) {
  providers.push(
    Credentials({
      id: "admin",
      name: "Admin key",
      credentials: { key: { label: "Admin key", type: "password" } },
      async authorize(creds, req) {
        await limit("login-admin:ip", requestIp(req), 5, 900);
        const given = sha256(String(creds?.key ?? ""));
        if (!timingSafeEqual(given, sha256(serverEnv.adminAccessKey))) throw new LoginError("invalid_key");
        const row = await upsertUser("admin:owner", "admin", true);
        return { id: row.id, name: "admin", role: "admin" };
      },
    }),
  );
}

if (discordEnabled) providers.push(Discord({ authorization: { params: { scope: "identify" } } }));

if (serverEnv.devLogin) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { username: { label: "Username", type: "text" } },
      async authorize(creds) {
        const name = String(creds?.username ?? "").trim().toLowerCase();
        if (!/^[a-z0-9_-]{2,24}$/.test(name)) return null;
        const row = await upsertUser(`dev:${name}`, name, name === "admin");
        return { id: row.id, name, role: row.role };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 3600 },
  trustHost: true,
  pages: { signIn: "/play" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "discord") return true;
      const id = String(profile?.id ?? account.providerAccountId);
      const created = discordCreatedAt(id);
      const minAgeMs = serverEnv.minDiscordAccountAgeDays * 86_400_000;
      // Blueprint §7.1: minimum Discord account age to keep bot accounts out.
      if (created && Date.now() - created.getTime() < minAgeMs) return "/play?error=account_too_new";
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (!account) return token;
      if (account.provider === "discord") {
        const discordId = String(profile?.id ?? account.providerAccountId);
        const p = profile as { global_name?: string; username?: string } | undefined;
        const row = await upsertUser(discordId, p?.global_name ?? p?.username ?? null);
        token.uid = row.id;
        token.role = row.role;
      } else {
        // Credentials providers already resolved the account and return our own user id.
        token.uid = user?.id;
        token.role = (user as { role?: string } | undefined)?.role === "admin" ? "admin" : "user";
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.role = token.role === "admin" ? "admin" : "user";
      return session;
    },
  },
});

