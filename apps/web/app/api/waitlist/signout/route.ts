import { ok, route } from "@/lib/api";
import { GATE_COOKIE } from "@/lib/waitlist";

/** Forgets the permit on this browser. Signing in with X again resumes it. */
export const POST = route({ access: "public", mutation: true, allowDuringMaintenance: true }, async (ctx) => {
  const res = ok({ signedOut: true }, ctx.now);
  res.cookies.set(GATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
});
