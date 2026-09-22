import type { Metadata } from "next";
import { auth } from "@/auth";
import { GameApp } from "@/components/game/game-app";
import { SignIn } from "@/components/game/sign-in";
import { discordEnabled, serverEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Play", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ error?: string; team?: string }> }) {
  const session = await auth();
  const { error, team } = await searchParams;
  if (!session?.user?.id) {
    return <SignIn discord={discordEnabled} dev={serverEnv.devLogin} admin={!!serverEnv.adminAccessKey} error={error} team={team === "1"} />;
  }
  return <GameApp userName={session.user.name ?? "miner"} isAdmin={session.user.role === "admin"} />;
}
