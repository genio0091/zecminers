import "server-only";
import { GameError } from "@hoodvalley/db";
import type { NextRequest } from "next/server";
import { GATE_COOKIE, verifyGateValue } from "./waitlist";

/** The waitlist entry id from the request's signed cookie, or a friendly error. */
export function gateEntryId(req: NextRequest): string {
  const id = verifyGateValue(req.cookies.get(GATE_COOKIE)?.value);
  if (!id) throw new GameError("NOT_FOUND", "Start the waitlist first.");
  return id;
}

/** Public origin for OAuth redirects: the canonical site URL when set, else this request's. */
export function siteOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL;
  return (configured ? new URL(configured).origin : req.nextUrl.origin).replace(/\/$/, "");
}
