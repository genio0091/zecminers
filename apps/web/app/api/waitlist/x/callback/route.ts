import { connectX, getDb } from "@hoodvalley/db";
import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "@/lib/waitlist-route";
import { GATE_COOKIE, gateCookieOptions, signGateValue, verifyGateValue } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

const basic = () => Buffer.from(`${process.env.AUTH_TWITTER_ID}:${process.env.AUTH_TWITTER_SECRET}`).toString("base64");

/** X sends the visitor back here: swap the code for a token, read who they are, attach it to their entry. */
export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const back = (path: string) => {
    const res = NextResponse.redirect(`${origin}${path}`);
    res.cookies.set("hv_x_oauth", "", { path: "/api/waitlist/x", maxAge: 0 });
    return res;
  };
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return back("/waitlist?x=cancelled");
  const stored = verifyGateValue(req.cookies.get("hv_x_oauth")?.value);
  const [state, verifier] = stored?.split(":") ?? [];
  const code = q.get("code");
  if (!state || !verifier || !code || q.get("state") !== state) return back("/waitlist?x=expired");

  try {
    const token = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: { authorization: `Basic ${basic()}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: `${origin}/api/waitlist/x/callback`, code_verifier: verifier }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!token.ok) {
      console.error("[waitlist/x] token exchange failed", token.status, await token.text().catch(() => ""));
      return back("/waitlist?x=error");
    }
    const { access_token: accessToken } = (await token.json()) as { access_token: string };
    const meRes = await fetch("https://api.x.com/2/users/me", { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) });
    const me = (await meRes.json().catch(() => null)) as { data?: { id?: string; username?: string } } | null;
    // We only needed the identity: hand the token straight back.
    void fetch("https://api.x.com/2/oauth2/revoke", {
      method: "POST",
      headers: { authorization: `Basic ${basic()}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: accessToken, token_type_hint: "access_token" }),
    }).catch(() => {});
    if (!meRes.ok || !me?.data?.id || !me.data.username) return back("/waitlist?x=error");

    const entry = await connectX(getDb(), {
      entryId: verifyGateValue(req.cookies.get(GATE_COOKIE)?.value),
      xId: me.data.id,
      xUsername: me.data.username,
      now: new Date(),
    });
    const res = back(entry.unlockedAt ? "/" : "/waitlist");
    res.cookies.set(GATE_COOKIE, signGateValue(entry.id), gateCookieOptions);
    return res;
  } catch (err) {
    console.error("[waitlist/x]", err);
    return back("/waitlist?x=error");
  }
}
