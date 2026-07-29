import "server-only";

/**
 * Best-effort in-memory rate limiter for a single server instance.
 * Vercel deployments run multiple isolated instances, so this only
 * throttles abuse within one instance — swap for Upstash Redis
 * (`@upstash/ratelimit`) before relying on this in production, see README.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count };
}
