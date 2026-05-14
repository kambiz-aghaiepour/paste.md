---
phase: 04-security-hardening
reviewed: 2026-05-14T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/proxy.ts
  - lib/rate-limiter.ts
  - next.config.ts
  - tests/lib/rate-limiter.test.ts
  - tests/security/headers.test.ts
findings:
  critical: 3
  warning: 9
  info: 3
  total: 15
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-14T12:00:00Z  
**Depth:** standard  
**Files Reviewed:** 5  
**Status:** issues_found

## Summary

Reviewed security hardening implementation including rate limiting, CSP headers, and middleware. Found **3 critical security vulnerabilities** that must be fixed before shipping: IP spoofing vulnerability in rate limiting, off-by-one error allowing extra requests, and blocking database call in middleware. Additionally found 9 warnings affecting reliability and security posture, and 3 informational findings for test improvements.

The rate limiting implementation has the right structure but contains exploitable security flaws. The CSP configuration is functional but could be strengthened. Test coverage exists but misses critical edge cases.

## Critical Issues

### CR-01: IP Spoofing Vulnerability - Rate Limiting Bypass

**File:** `app/proxy.ts:15-21`  
**Issue:** The `getClientIp()` function unconditionally trusts the `x-forwarded-for` header without validation. Any client can send an arbitrary `x-forwarded-for` header to bypass rate limiting by rotating spoofed IP addresses. Additionally, all clients without the header are grouped under the "unknown" key, sharing a single rate limit bucket.

**Security Impact:** Attacker can trivially bypass rate limiting by sending:
```bash
curl -H "x-forwarded-for: 1.2.3.4" -X POST /api/paste  # Request 1-5
curl -H "x-forwarded-for: 5.6.7.8" -X POST /api/paste  # Request 6-10
# Infinite requests by rotating IPs
```

**Fix:**
```typescript
function getClientIp(request: NextRequest): string {
  // Only trust x-forwarded-for when behind a known proxy
  // Option 1: Use Next.js built-in IP detection
  const ip = request.ip || request.headers.get("x-real-ip");
  if (ip) return ip;
  
  // Option 2: Validate proxy chain (if behind specific reverse proxy)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the LAST IP (closest to server), not first (user-controlled)
    const ips = forwarded.split(",").map(ip => ip.trim());
    return ips[ips.length - 1];
  }
  
  // Option 3: Fail closed - reject requests without valid IP
  throw new Error("Cannot determine client IP");
}
```

**Recommended approach:** Use `request.ip` (available in Next.js when deployed behind a proxy) or configure `trustProxy` in Next.js config and take the last IP in the forwarded chain, not the first.

### CR-02: Off-by-One Error in Rate Limiter

**File:** `lib/rate-limiter.ts:30-36`  
**Issue:** The rate limiter allows `maxRequests + 1` total requests instead of `maxRequests`. The first request sets `count: 1` (line 30), subsequent requests increment count (line 34), and blocking occurs when `count > maxRequests` (line 36). With `maxRequests=5`, requests 1-6 all succeed, and only the 7th is blocked.

**Security Impact:** Rate limiting is 20% weaker than configured (6 requests instead of 5). Under sustained attack, this compounds to allow significantly more traffic than intended.

**Fix:**
```typescript
function check(key: string): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  // Check BEFORE incrementing, not after
  if (existing.count >= maxRequests) {
    const remainingMs = existing.resetAt - now;
    return {
      limited: true,
      retryAfterSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  existing.count += 1;
  return { limited: false, retryAfterSeconds: 0 };
}
```

Change line 36 from `>` to `>=` and check before incrementing.

### CR-03: Blocking Database Call in Middleware

**File:** `app/proxy.ts:53`  
**Issue:** `getPasteById(slug)` is called synchronously in middleware on every paste route match. Since the codebase uses `better-sqlite3` (synchronous SQLite), this blocks the Node.js event loop during database I/O, creating a performance bottleneck and potential DoS vector. Middleware runs before route handlers, so every `/[slug]` request waits for database I/O.

**Fix:**
```typescript
// Option 1: Move expiry check to route handler (recommended for v1)
// Remove lines 52-71 from proxy.ts
// Add expiry check in app/[slug]/page.tsx after getPasteById()

// Option 2: Use async middleware (requires Next.js 15.1+)
export async function proxy(request: NextRequest) {
  // ... rate limiting (sync) ...
  
  const slug = request.nextUrl.pathname.slice(1);
  const paste = await getPasteByIdAsync(slug); // Use async SQLite wrapper
  
  if (paste?.expiresAt && Date.now() / 1000 > paste.expiresAt) {
    return new Response(/* ... */);
  }
  
  return NextResponse.next();
}
```

**Recommended:** Move the expiry check to the `[slug]/page.tsx` route handler. Middleware should only handle fast, non-blocking operations (rate limiting, header checks). Database queries belong in route handlers.

## Warnings

### WR-01: Missing Error Handling Around Database Call

**File:** `app/proxy.ts:53`  
**Issue:** No try-catch around `getPasteById()`. If the database file is locked, corrupted, or missing, the exception will crash the middleware and return 500 for all requests.

**Fix:**
```typescript
try {
  const paste = getPasteById(slug);
  if (paste?.expiresAt && Date.now() / 1000 > paste.expiresAt) {
    return new Response(/* 410 response */);
  }
} catch (error) {
  console.error("Database error in middleware:", error);
  // Let request continue - route handler will return proper error
  return NextResponse.next();
}
```

### WR-02: Unbounded Memory Growth Between Cleanup Intervals

**File:** `lib/rate-limiter.ts:12`  
**Issue:** The in-memory Map can grow unbounded between cleanup intervals. During a traffic burst, thousands of unique IPs can accumulate before cleanup runs. A 60-second window means cleanup only runs once per minute.

**Fix:**
```typescript
export function createRateLimiter(
  maxRequests: number, 
  windowMs: number,
  maxEntries = 10000 // Add size limit
) {
  const store = new Map<string, RateLimitEntry>();

  function check(key: string): RateLimitResult {
    // Enforce max entries
    if (!store.has(key) && store.size >= maxEntries) {
      // Emergency cleanup: remove oldest entries
      const now = Date.now();
      for (const [k, entry] of store) {
        if (now > entry.resetAt) {
          store.delete(k);
          if (store.size < maxEntries) break;
        }
      }
      
      // If still full, reject with 503 (service overload)
      if (store.size >= maxEntries) {
        return { 
          limited: true, 
          retryAfterSeconds: Math.ceil(windowMs / 1000) 
        };
      }
    }
    
    // ... rest of check logic ...
  }
  
  return { check };
}
```

### WR-03: Cleanup Interval Never Stops - Timer Leak

**File:** `lib/rate-limiter.ts:14-23`  
**Issue:** The `setInterval` cleanup timer runs forever. In test environments or during Next.js hot-reload, this leaks timers. Over time, multiple cleanup intervals accumulate in memory.

**Fix:**
```typescript
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
    // ... existing logic ...
  }
  
  // Add destroy method
  function destroy() {
    clearInterval(cleanupInterval);
    store.clear();
  }

  return { check, destroy };
}
```

### WR-04: CSP Allows Unsafe Inline Styles in Production

**File:** `next.config.ts:8`  
**Issue:** `style-src 'self' 'unsafe-inline'` permits inline styles in production builds. This weakens CSP's protection against CSS-based attacks (data exfiltration via CSS selectors, UI redressing).

**Fix:**
```typescript
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  // Remove 'unsafe-inline' for production
  `style-src 'self'${isDev ? " 'unsafe-inline'" : ""}`,
  "img-src 'self'",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws://localhost:3000" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
```

Tailwind v4 should work without `unsafe-inline` via proper CSS generation. If inline styles are still needed, use nonces or hashes.

### WR-05: Missing Essential CSP Directives

**File:** `next.config.ts:5-15`  
**Issue:** CSP is missing several important security directives:
- `object-src 'none'` - blocks Flash, Java applets, and other plugins
- `upgrade-insecure-requests` - forces HTTP resources to load via HTTPS
- `block-all-mixed-content` - prevents HTTP content on HTTPS pages

**Fix:**
```typescript
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws://localhost:3000" : ""}`,
  "object-src 'none'",  // Block plugins
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",  // Force HTTPS
  "block-all-mixed-content",    // Block HTTP on HTTPS
].join("; ");
```

### WR-06: Middleware File Naming Doesn't Follow Next.js Convention

**File:** `app/proxy.ts:23`  
**Issue:** File is named `proxy.ts` and exports `proxy()` function, but Next.js middleware convention expects `middleware.ts` exporting `middleware()`. This works because it's manually imported, but violates framework conventions and may confuse developers.

**Fix:** Rename file to `middleware.ts` and export function as `middleware`:
```typescript
// File: app/middleware.ts (or middleware.ts in root)
export function middleware(request: NextRequest) {
  // ... existing logic ...
}

export const config = {
  matcher: [
    "/:slug([A-Za-z0-9_-]{8})",
    "/api/paste",
  ],
};
```

### WR-07: Test Doesn't Verify 6th Request is Blocked

**File:** `tests/lib/rate-limiter.test.ts:10-18`  
**Issue:** Test "allows requests under threshold" loops 5 times and checks all are allowed, but doesn't verify the 6th request is blocked. This test passes despite the off-by-one bug (CR-02).

**Fix:**
```typescript
it("SECU-03: allows requests under threshold", () => {
  const limiter = createRateLimiter(5, 60000);

  for (let i = 0; i < 5; i++) {
    const result: RateLimitResult = limiter.check("192.168.1.1");
    expect(result.limited).toBe(false);
    expect(result.retryAfterSeconds).toBe(0);
  }
  
  // Verify 6th request IS blocked
  const blocked = limiter.check("192.168.1.1");
  expect(blocked.limited).toBe(true);
  expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
});
```

### WR-08: Timing-Dependent Test is Flaky

**File:** `tests/lib/rate-limiter.test.ts:42-54`  
**Issue:** Test relies on real setTimeout delays (150ms wait with 100ms window). This is flaky on slow CI systems or under heavy load. Modern test frameworks provide fake timers for deterministic time control.

**Fix:**
```typescript
it("SECU-03: resets after window expires", async () => {
  vi.useFakeTimers();
  const limiter = createRateLimiter(1, 100);

  const first = limiter.check("192.168.1.1");
  expect(first.limited).toBe(false);

  const second = limiter.check("192.168.1.1");
  expect(second.limited).toBe(true);

  // Advance time by 150ms
  vi.advanceTimersByTime(150);

  const third = limiter.check("192.168.1.1");
  expect(third.limited).toBe(false);
  
  vi.useRealTimers();
});
```

### WR-09: No Runtime Header Verification

**File:** `tests/security/headers.test.ts:104-161`  
**Issue:** Tests only verify `next.config.ts` configuration, not actual HTTP response headers. Configuration could be correct but headers might not appear in responses due to middleware conflicts, deployment config, or Next.js bugs.

**Fix:**
```typescript
import { NextRequest } from "next/server";
import { GET } from "@/app/api/paste/route";

describe("SECU-02: Runtime header verification", () => {
  it("SECU-02: CSP header appears in actual HTTP responses", async () => {
    const request = new NextRequest(
      new URL("http://localhost:3000/api/paste?id=test123")
    );
    const response = await GET(request);
    
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
  });
  
  it("SECU-02: All security headers present in response", async () => {
    const request = new NextRequest(new URL("http://localhost:3000/"));
    const response = await GET(request);
    
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});
```

## Info

### IN-01: Development CSP Permits Unsafe Scripts

**File:** `next.config.ts:7`  
**Issue:** Development mode enables `unsafe-eval` and `unsafe-inline` for scripts, which is necessary for Hot Module Replacement but weakens security. This is expected for dev mode, but should be documented to ensure developers understand dev builds are not production-safe.

**Fix:** Add comment:
```typescript
const cspDirectives = [
  "default-src 'self'",
  // Development: unsafe-eval/unsafe-inline required for HMR
  // Production: strict CSP (no unsafe directives)
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  // ...
];
```

### IN-02: Test Doesn't Verify Map Size Shrinks During Cleanup

**File:** `tests/lib/rate-limiter.test.ts:68-81`  
**Issue:** Test "expired entries are cleaned from internal store" verifies cleanup behavior indirectly (by checking a fresh request succeeds), but doesn't verify the Map actually shrinks. This is a test coverage gap for potential memory leaks (WR-02).

**Fix:**
```typescript
it("SECU-03: expired entries are cleaned from internal store", async () => {
  const limiter = createRateLimiter(1, 100);

  limiter.check("192.168.1.1");
  limiter.check("192.168.1.2");
  limiter.check("192.168.1.3");

  // Access internal store via closure or expose size() method
  // For now, indirect verification via behavior is acceptable
  
  await new Promise((resolve) => setTimeout(resolve, 250));

  // All IPs should start fresh (indicates cleanup happened)
  expect(limiter.check("192.168.1.1").limited).toBe(false);
  expect(limiter.check("192.168.1.2").limited).toBe(false);
  expect(limiter.check("192.168.1.3").limited).toBe(false);
});
```

To properly verify, expose a `size()` method or use dependency injection to pass a spy-able store.

### IN-03: No CSP Violation Testing

**File:** `tests/security/headers.test.ts`  
**Issue:** Tests verify CSP headers are configured but don't verify CSP actually blocks prohibited content. End-to-end tests should confirm inline scripts fail, external resources are blocked, etc.

**Fix:** Add browser-based tests using Playwright or Puppeteer:
```typescript
// tests/e2e/csp.test.ts (future enhancement)
describe("CSP enforcement", () => {
  it("blocks inline scripts", async () => {
    const page = await browser.newPage();
    const violations: string[] = [];
    
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("CSP")) {
        violations.push(msg.text());
      }
    });
    
    await page.setContent(`
      <html>
        <script>window.inlineScriptRan = true;</script>
      </html>
    `);
    
    expect(violations.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.inlineScriptRan)).toBeUndefined();
  });
});
```

---

_Reviewed: 2026-05-14T12:00:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
