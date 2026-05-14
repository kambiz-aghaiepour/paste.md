import { describe, it, expect, vi, afterEach } from "vitest";
import { createRateLimiter } from "@/lib/rate-limiter";
import type { RateLimitResult } from "@/lib/rate-limiter";

describe("rate limiter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("SECU-03: allows requests under threshold", () => {
    const limiter = createRateLimiter(5, 60000);

    for (let i = 0; i < 5; i++) {
      const result: RateLimitResult = limiter.check("192.168.1.1");
      expect(result.limited).toBe(false);
      expect(result.retryAfterSeconds).toBe(0);
    }
  });

  it("SECU-03: blocks requests over threshold", () => {
    const limiter = createRateLimiter(5, 60000);

    for (let i = 0; i < 5; i++) {
      limiter.check("192.168.1.1");
    }

    const result = limiter.check("192.168.1.1");
    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("SECU-03: tracks IPs independently", () => {
    const limiter = createRateLimiter(1, 60000);

    const resultA = limiter.check("ip-a");
    expect(resultA.limited).toBe(false);

    const resultB = limiter.check("ip-b");
    expect(resultB.limited).toBe(false);
  });

  it("SECU-03: resets after window expires", async () => {
    const limiter = createRateLimiter(1, 100);

    const first = limiter.check("192.168.1.1");
    expect(first.limited).toBe(false);

    const second = limiter.check("192.168.1.1");
    expect(second.limited).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const third = limiter.check("192.168.1.1");
    expect(third.limited).toBe(false);
  });

  it("SECU-03: retryAfterSeconds is a positive integer", () => {
    const limiter = createRateLimiter(1, 60000);

    limiter.check("192.168.1.1");
    const result = limiter.check("192.168.1.1");

    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(Number.isInteger(result.retryAfterSeconds)).toBe(true);
  });

  it("SECU-03: expired entries are cleaned from internal store", async () => {
    const limiter = createRateLimiter(1, 100);

    limiter.check("192.168.1.1");
    limiter.check("192.168.1.2");

    // Wait for cleanup interval to fire (window + buffer)
    await new Promise((resolve) => setTimeout(resolve, 250));

    // After cleanup, checking a previously-seen IP should start fresh
    const result = limiter.check("192.168.1.1");
    expect(result.limited).toBe(false);
    expect(result.retryAfterSeconds).toBe(0);
  });
});
