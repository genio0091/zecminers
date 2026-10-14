/** Typed API errors: code → HTTP status. */
export const ERROR_STATUS = {
  PASS_MOVED: 409,
  SESSION_ALREADY_STARTED: 409,
  WINDOW_CLOSED: 409,
  SEASON_NOT_STARTED: 409,
  CLAIM_FIRST: 409,
  GEAR_UP_FIRST: 409,
  NOTHING_TO_CLAIM: 409,
  NOTHING_TO_GEAR: 409,
  POOL_EXHAUSTED: 409,
  INSUFFICIENT_BALANCE: 409,
  MAINTENANCE: 503,
  RATE_LIMITED: 429,
  NO_PASS: 403,
  PASS_INACTIVE: 403,
  ACCOUNT_FROZEN: 403,
  INVALID_CLAIM: 400,
  INVALID_ADDRESS: 400,
  WALLET_ALREADY_LINKED: 409,
  ADDRESS_TAKEN: 409,
  RAFFLE_CLOSED: 409,
  RAFFLE_NOT_READY: 409,
  BATCH_STATE: 409,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  TURNSTILE_FAILED: 400,
  BAD_ORIGIN: 403,
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  LEDGER_UNBALANCED: 500,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export class GameError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message ?? code);
    this.name = "GameError";
    this.status = ERROR_STATUS[code];
  }
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  let e: unknown = err;
  // drizzle wraps driver errors; walk the cause chain
  for (let i = 0; i < 4 && e; i++) {
    const x = e as { code?: string; constraint?: string; cause?: unknown };
    if (x.code === "23505") return constraint ? x.constraint === constraint : true;
    e = x.cause;
  }
  return false;
}
