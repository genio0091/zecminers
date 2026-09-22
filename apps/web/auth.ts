import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import { eq } from "drizzle-orm";
import { getDb, tables } from "@zecminers/db";
import { discordEnabled, serverEnv } from "@/lib/env";

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

async function upsertUser(discordId: string, username: string | null) {
  const db = getDb();
  const role = serverEnv.adminDiscordIds.includes(discordId) ? "admin" : undefined;
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

const providers = [];
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
        const discordId = `dev:${name}`;
        const user = await upsertUser(discordId, name);
        if (name === "admin" && user.role !== "admin") {
          await getDb().update(tables.users).set({ role: "admin" }).where(eq(tables.users.id, user.id));
        }
        return { id: discordId, name };
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
      if (account) {
        const discordId =
          account.provider === "discord" ? String(profile?.id ?? account.providerAccountId) : String(user?.id ?? token.sub);
        const username =
          account.provider === "discord"
            ? String((profile as { global_name?: string; username?: string })?.global_name ?? (profile as { username?: string })?.username ?? "")
            : String(user?.name ?? "");
        const row = await upsertUser(discordId, username || null);
        token.uid = row.id;
        token.role = row.role;
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
