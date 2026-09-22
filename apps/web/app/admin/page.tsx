import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, tables } from "@zecminers/db";
import { auth } from "@/auth";
import { AdminApp } from "@/components/admin/admin-app";
import { serverEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Admin panel (blueprint §7.8). Role + IP allowlist are enforced again on every API call. */
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/play");
  const [user] = await getDb().select().from(tables.users).where(eq(tables.users.id, session.user.id));
  const isAdmin = !!user && (user.role === "admin" || serverEnv.adminDiscordIds.includes(user.discordId));
  if (!isAdmin) redirect("/play");
  if (serverEnv.adminIpAllowlist.length) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    if (!ip || !serverEnv.adminIpAllowlist.includes(ip)) redirect("/play");
  }
  return (
    <div className="min-h-screen bg-ink text-sm">
      <AdminApp />
    </div>
  );
}
