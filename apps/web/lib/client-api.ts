"use client";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResult<T> = { ok: true; data: T; serverTime: string } | { ok: false; error: ApiError; serverTime: string };

export function newIdempotencyKey(prefix = "k"): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}

/** Thin fetch wrapper for our JSON envelope. Mutations are same-origin POSTs. */
export async function api<T>(
  path: string,
  opts: { method?: "GET" | "POST"; body?: unknown; idempotencyKey?: string } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
  try {
    const res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
    if (json && typeof json === "object" && "ok" in json) return json;
    return { ok: false, error: { code: "NETWORK", message: `Unexpected response (${res.status}).` }, serverTime: new Date().toISOString() };
  } catch {
    return { ok: false, error: { code: "NETWORK", message: "Network error. Check your connection." }, serverTime: new Date().toISOString() };
  }
}

export function fmt(value: string | number | bigint | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const s = String(value);
  if (!/^-?\d+$/.test(s)) return s;
  const neg = s.startsWith("-");
  const digits = neg ? s.slice(1) : s;
  return (neg ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function short(value: string | null | undefined, head = 8, tail = 6): string {
  if (!value) return "—";
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
