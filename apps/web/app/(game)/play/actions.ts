"use server";

import { signIn, signOut } from "@/auth";

export async function signInDiscord() {
  await signIn("discord", { redirectTo: "/play" });
}

export async function signInDev(formData: FormData) {
  await signIn("dev", { username: String(formData.get("username") ?? ""), redirectTo: "/play" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
