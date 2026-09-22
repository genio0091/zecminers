"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";

/** Credentials sign-ins throw on failure; turn that into a readable error on the sign-in page. */
async function credentials(provider: "wallet" | "admin" | "dev", fields: Record<string, string>, redirectTo: string) {
  try {
    await signIn(provider, { ...fields, redirectTo });
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as AuthError & { code?: string }).code ?? err.type;
      redirect(`/play?error=${encodeURIComponent(code)}${provider === "admin" ? "&team=1" : ""}`);
    }
    throw err; // NEXT_REDIRECT on success
  }
}

export async function signInWallet(formData: FormData) {
  await credentials(
    "wallet",
    { address: String(formData.get("address") ?? ""), code: String(formData.get("code") ?? "") },
    "/play",
  );
}

export async function signInAdmin(formData: FormData) {
  await credentials("admin", { key: String(formData.get("key") ?? "") }, "/admin");
}

export async function signInDiscord() {
  await signIn("discord", { redirectTo: "/play" });
}

export async function signInDev(formData: FormData) {
  await credentials("dev", { username: String(formData.get("username") ?? "") }, "/play");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
