// Fixed-window rate limiter backed by Postgres, so it works across serverless
// invocations without another service. One atomic upsert per check: the row's
// window either increments or resets when expired. Swap the implementation
// (e.g. for Upstash Redis) without changing callers.

import "server-only";
import { prisma } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets — for a Retry-After header. */
  retryAfter: number;
}

/**
 * Count a hit against `key` and report whether it stays within `max` per
 * `windowMs`. Keys should include the scope, e.g. "login:1.2.3.4" or
 * "kitchen-clock:rest_abc:1.2.3.4".
 */
export async function limit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" <= ${new Date(now.getTime() - windowMs)}
        THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" <= ${new Date(now.getTime() - windowMs)}
        THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"
  `;
  const row = rows[0];
  const resetAt = row.windowStart.getTime() + windowMs;
  return {
    allowed: row.count <= max,
    retryAfter: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

/** Client IP for rate-limit keys. Vercel/most proxies set x-forwarded-for. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
