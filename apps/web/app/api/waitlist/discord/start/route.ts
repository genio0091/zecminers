import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { discordGate, discordOAuthEnabled, GATE_COOKIE, signGateValue, verifyGateValue } from "@/lib/waitlist";
import { siteOrigin } from "@/lib/waitlist-route";

export const dynamic = "force-dynamic";

/**
 * The Discord stamp: send the visitor to Discord (scopes identify + guilds) so we can see whether
 * they are in the Hood Valley server. `prompt=none` skips the consent screen on a re-check.
 */
export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  if (!discordOAuthEnabled) return NextResponse.redirect(`${origin}/waitlist?discord=unavailable`);
  if (!verifyGateValue(req.cookies.get(GATE_COOKIE)?.value)) return NextResponse.redirect(`${origin}/waitlist`);
  const state = randomBytes(16).toString("base64url");
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: discordGate.clientId,
    redirect_uri: `${origin}/api/waitlist/discord/callback`,
    scope: "identify guilds",
    state,
    prompt: "none",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("hv_dc_oauth", signGateValue(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/waitlist/discord",
    maxAge: 600,
  });
  return res;
}
