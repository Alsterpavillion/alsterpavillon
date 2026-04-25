/**
 * Rate-limit interface (M0 stub — fail-closed by design).
 *
 * The real backend (Upstash / Redis / Postgres) lands in M3+ when public
 * endpoints (offer-acceptance, public webhooks) appear. Until then, every
 * caller MUST go through this module so the future swap is mechanical.
 *
 * For M0 there are no public mutating endpoints exposed. If a caller wires
 * this in before the real implementation is ready, `checkRateLimit` throws —
 * keeping us fail-closed instead of silently letting traffic through.
 */
export type RateLimitKey = {
  bucket: string;
  identifier: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export async function checkRateLimit(key: RateLimitKey): Promise<RateLimitResult> {
  throw new Error(
    `rate-limit backend not implemented (M0 stub) for ${key.bucket}:${key.identifier}. ` +
      "Wire a real backend before exposing public mutation endpoints.",
  );
}
