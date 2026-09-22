import type { Metadata } from "next";
import { auth } from "@/auth";
import { GameApp } from "@/components/game/game-app";
import { SignIn } from "@/components/game/sign-in";
import { discordEnabled, serverEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Play", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  const { error } = await searchParams;
  if (!session?.user?.id) {
    return <SignIn discord={discordEnabled} dev={serverEnv.devLogin} error={error} />;
  }
  return <GameApp userName={session.user.name ?? "miner"} isAdmin={session.user.role === "admin"} />;
}
