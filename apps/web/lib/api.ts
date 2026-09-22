import "server-only";
import { GameError, getDb, getMaintenance, type Database } from "@zecminers/db";
import { eq } from "drizzle-orm";
import { tables } from "@zecminers/db";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { serverEnv } from "./env";
import { rateLimit } from "./rate-limit";
import { verifyTurnstile } from "./turnstile";

export interface ApiUser {
  id: string;
  role: "user" | "admin";
  discordId: string;
  status: "active" | "frozen";
}

export interface ApiContext<B> {
  req: NextRequest;
  db: Database;
  now: Date;
  body: B;
  user: ApiUser | null;
  ip: string | null;
  idempotencyKey: string | null;
  params: Record<string, string>;
}

interface RouteOptions<S extends z.ZodType | undefined> {
  access: "public" | "user" | "admin";
  /** POST that changes state: Origin check, maintenance check, rate limit. */
  mutation?: boolean;
  body?: S;
  /** Require an Idempotency-Key header (upgrade, repair, tickets, exchange, grants). */
  idempotency?: boolean;
  turnstile?: boolean;
  rate?: { limit: number; windowSec: number; name: string };
  /** Admin endpoints that must keep working while maintenance is on. */
  allowDuringMaintenance?: boolean;
}

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return new NextResponse(JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v)), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export function ok(data: unknown, now = new Date(), headers?: Record<string, string>) {
  return json({ ok: true, data, serverTime: now.toISOString() }, 200, headers);
}

export function fail(code: string, message: string, status: number, details?: unknown, headers?: Record<string, string>) {
  return json({ ok: false, error: { code, message, details }, serverTime: new Date().toISOString() }, status, headers);
}

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}

/** Blueprint §9.2: every POST must come from our own origin. */
function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([req.nextUrl.origin, ...serverEnv.appOrigins.map((o) => o.replace(/\/$/, ""))]);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    allowed.add(`https://${host}`);
    if (!serverEnv.isProd) allowed.add(`http://${host}`);
  }
  return allowed.has(origin);
}

const IDEMPOTENCY_RE = /^[A-Za-z0-9:_-]{8,128}$/;

export function route<S extends z.ZodType | undefined = undefined>(
  opts: RouteOptions<S>,
  handler: (ctx: ApiContext<S extends z.ZodType ? z.infer<S> : undefined>) => Promise<unknown>,
) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const now = new Date();
    try {
      const params = (await context?.params) ?? {};
      const ip = clientIp(req);
      const db = getDb();

      if (opts.mutation && !originAllowed(req)) throw new GameError("BAD_ORIGIN", "Cross-origin request rejected.");

      let user: ApiUser | null = null;
      if (opts.access !== "public") {
        const session = await auth();
        const uid = session?.user?.id;
        if (!uid) throw new GameError("UNAUTHORIZED", "Sign in first.");
        const [row] = await db.select().from(tables.users).where(eq(tables.users.id, uid)).limit(1);
        if (!row) throw new GameError("UNAUTHORIZED", "Sign in again.");
        const isAdmin = row.role === "admin" || serverEnv.adminDiscordIds.includes(row.discordId);
        user = { id: row.id, role: isAdmin ? "admin" : "user", discordId: row.discordId, status: row.status };
        if (opts.access === "admin") {
          if (!isAdmin) throw new GameError("FORBIDDEN", "Admins only.");
          if (serverEnv.adminIpAllowlist.length && (!ip || !serverEnv.adminIpAllowlist.includes(ip))) {
            throw new GameError("FORBIDDEN", "Admin access is limited to allow-listed IPs.");
          }
        }
      }

      if (opts.mutation && !opts.allowDuringMaintenance) {
        const m = await getMaintenance(db);
        if (m.on) throw new GameError("MAINTENANCE", "ZecMiners is in maintenance. Balances are safe; actions are paused.");
      }

      if (opts.rate) {
        const who = user?.id ?? ip ?? "anon";
        const [byUser, byIp] = await Promise.all([
          rateLimit(`${opts.rate.name}:u:${who}`, opts.rate.limit, opts.rate.windowSec),
          ip ? rateLimit(`${opts.rate.name}:ip:${ip}`, opts.rate.limit * 5, opts.rate.windowSec) : Promise.resolve({ ok: true, resetSeconds: 0 }),
        ]);
        if (!byUser.ok || !byIp.ok) {
          return fail("RATE_LIMITED", "Too many requests. Slow down a little.", 429, undefined, {
            "retry-after": String(Math.max(byUser.resetSeconds, byIp.resetSeconds)),
          });
        }
      }

      const idempotencyKey = req.headers.get("idempotency-key");
      if (opts.idempotency && (!idempotencyKey || !IDEMPOTENCY_RE.test(idempotencyKey))) {
        throw new GameError("IDEMPOTENCY_KEY_REQUIRED", "Send an Idempotency-Key header (8–128 chars).");
      }

      let body: unknown = undefined;
      if (opts.body || opts.turnstile) {
        const raw = await req.json().catch(() => ({}));
        if (opts.turnstile) {
          const token = (raw as { turnstileToken?: string })?.turnstileToken;
          if (!(await verifyTurnstile(token, ip))) throw new GameError("TURNSTILE_FAILED", "Human check failed. Try again.");
        }
        if (opts.body) {
          const parsed = opts.body.safeParse(raw);
          if (!parsed.success) {
            throw new GameError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid request.", {
              issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
            });
          }
          body = parsed.data;
        }
      }

      const data = await handler({
        req,
        db,
        now,
        body: body as S extends z.ZodType ? z.infer<S> : undefined,
        user,
        ip,
        idempotencyKey,
        params,
      });
      if (data instanceof Response) return data;
      return ok(data, now);
    } catch (err) {
      if (err instanceof GameError) return fail(err.code, err.message, err.status, err.details);
      console.error("[api]", req.method, req.nextUrl.pathname, err);
      return fail("INTERNAL", "Something went wrong on our side.", 500);
    }
  };
}

export function requireUser(ctx: { user: ApiUser | null }): ApiUser {
  if (!ctx.user) throw new GameError("UNAUTHORIZED");
  return ctx.user;
}
