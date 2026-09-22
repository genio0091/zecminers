import "server-only";
import { serverEnv } from "./env";

/** Cloudflare Turnstile on login-adjacent actions, pass redeem and raffle tickets (blueprint §7.7). */
export async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  if (!serverEnv.turnstileSecret) return true; // not configured (local dev)
  if (!token) return false;
  const body = new URLSearchParams({ secret: serverEnv.turnstileSecret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
