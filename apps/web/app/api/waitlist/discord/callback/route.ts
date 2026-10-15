import { connectDiscord, GameError, getDb } from "@hoodvalley/db";
import { NextResponse, type NextRequest } from "next/server";
import { discordGate, GATE_COOKIE, verifyGateValue } from "@/lib/waitlist";
import { siteOrigin } from "@/lib/waitlist-route";

export const dynamic = "force-dynamic";

const API = "https://discord.com/api/v10";
const basic = () => Buffer.from(`${discordGate.clientId}:${discordGate.clientSecret}`).toString("base64");

/** Discord sends the visitor back here: read who they are and whether they joined the server, then hand the token back. */
export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const back = (result: string) => {
    const res = NextResponse.redirect(`${origin}/waitlist?discord=${result}`);
    res.cookies.set("hv_dc_oauth", "", { path: "/api/waitlist/discord", maxAge: 0 });
    return res;
  };
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return back("cancelled");
  const state = verifyGateValue(req.cookies.get("hv_dc_oauth")?.value);
  const entryId = verifyGateValue(req.cookies.get(GATE_COOKIE)?.value);
  const code = q.get("code");
  if (!state || !code || q.get("state") !== state || !entryId) return back("expired");

  try {
    const token = await fetch(`${API}/oauth2/token`, {
      method: "POST",
      headers: { authorization: `Basic ${basic()}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: `${origin}/api/waitlist/discord/callback` }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!token.ok) {
      console.error("[waitlist/discord] token exchange failed", token.status, await token.text().catch(() => ""));
      return back("error");
    }
    const { access_token: accessToken } = (await token.json()) as { access_token: string };
    const headers = { authorization: `Bearer ${accessToken}` };
    const [meRes, guildsRes] = await Promise.all([
      fetch(`${API}/users/@me`, { headers, signal: AbortSignal.timeout(10_000) }),
      fetch(`${API}/users/@me/guilds`, { headers, signal: AbortSignal.timeout(10_000) }),
    ]);
    // Identity and guild list are all we needed: hand the token straight back.
    void fetch(`${API}/oauth2/token/revoke`, {
      method: "POST",
      headers: { authorization: `Basic ${basic()}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: accessToken, token_type_hint: "access_token" }),
    }).catch(() => {});
    const me = (await meRes.json().catch(() => null)) as { id?: string; username?: string; global_name?: string | null } | null;
    const guilds = (await guildsRes.json().catch(() => null)) as { id: string }[] | null;
    if (!meRes.ok || !guildsRes.ok || !me?.id || !me.username || !Array.isArray(guilds)) return back("error");

    const member = guilds.some((g) => g.id === discordGate.guildId);
    await connectDiscord(getDb(), { entryId, discordId: me.id, discordUsername: me.username, member, now: new Date() });
    return back(member ? "member" : "missing");
  } catch (err) {
    if (err instanceof GameError && err.code === "CONFLICT") return back("taken");
    if (err instanceof GameError && err.code === "NOT_FOUND") return back("expired");
    console.error("[waitlist/discord]", err);
    return back("error");
  }
}
