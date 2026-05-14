export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, windowMs);

  cleanupInterval.unref();

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now > existing.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return { limited: false, retryAfterSeconds: 0 };
    }

    existing.count += 1;

    if (existing.count > maxRequests) {
      const remainingMs = existing.resetAt - now;
      return {
        limited: true,
        retryAfterSeconds: Math.ceil(remainingMs / 1000),
      };
    }

    return { limited: false, retryAfterSeconds: 0 };
  }

  return { check };
}
