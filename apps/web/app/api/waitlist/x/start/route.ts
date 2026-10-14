import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "@/lib/waitlist-route";
import { signGateValue, xOAuthEnabled } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

/**
 * Step 1: send the visitor to X (OAuth 2.0 with PKCE). Read-only scopes — Hood Valley never posts
 * as the user. State and verifier ride in a short-lived signed cookie.
 */
export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  if (!xOAuthEnabled) return NextResponse.redirect(`${origin}/?x=unavailable`);
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: process.env.AUTH_TWITTER_ID!,
    redirect_uri: `${origin}/api/waitlist/x/callback`,
    scope: "users.read tweet.read",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("hv_x_oauth", signGateValue(`${state}:${verifier}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/waitlist/x",
    maxAge: 600,
  });
  return res;
}
