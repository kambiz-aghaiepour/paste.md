# Phase 4: Security Hardening - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 5 (3 modify, 2 create)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `next.config.ts` | config | - | `next.config.ts` (existing) | exact |
| `app/proxy.ts` | middleware | request-response | `app/proxy.ts` (existing) | exact |
| `lib/rate-limiter.ts` | utility | request-response | `lib/expiration.ts` | role-match |
| `tests/lib/rate-limiter.test.ts` | test | - | `tests/lib/expiration.test.ts` | exact |
| `tests/security/headers.test.ts` | test | request-response | `tests/api/paste.test.ts` | role-match |

## Pattern Assignments

### `next.config.ts` (config, modify)

**Analog:** `next.config.ts` (existing)

**Current structure** (lines 1-7):
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

**Pattern to follow:**
- Extend the existing config object with new properties
- Use TypeScript type imports (`import type`)
- Export as default
- Keep config flat and readable

**New additions:**
- Add `experimental.sri` configuration for Subresource Integrity
- Add `async headers()` function to return security headers for all routes
- Create `cspDirectives` constant with environment-conditional logic (dev vs prod)

**From RESEARCH.md** (lines 419-464):
```typescript
const isDev = process.env.NODE_ENV === "development";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws://localhost:3000" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    sri: {
      algorithm: "sha256",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};
```

---

### `app/proxy.ts` (middleware, request-response, modify)

**Analog:** `app/proxy.ts` (existing)

**Current structure** (lines 1-32):
```typescript
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";

export const config = {
  matcher: "/:slug([A-Za-z0-9_-]{8})",
};

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice(1);
  const paste = getPasteById(slug);

  if (paste?.expiresAt && Date.now() / 1000 > paste.expiresAt) {
    return new Response(
      `<!DOCTYPE html>...`,
      {
        status: 410,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  return NextResponse.next();
}
```

**Pattern to follow:**
- Export `config` object with `matcher` array or string
- Export `proxy` function that takes `NextRequest` and returns a Response
- Use early returns for special cases (410, 429)
- Return `NextResponse.next()` to pass through to route handlers
- Import utility functions from `@/lib`

**New additions:**
- Expand `config.matcher` to include both existing pattern and `/api/paste`
- Add conditional logic at top of `proxy()` to check POST /api/paste first
- Extract client IP from headers using helper function
- Call rate limiter module and return 429 if limited
- Keep existing 410 logic as fallback

**IP extraction pattern** (from RESEARCH.md lines 339-350):
```typescript
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
```

**Rate limiting integration** (from RESEARCH.md lines 292-312):
```typescript
export const config = {
  matcher: [
    "/:slug([A-Za-z0-9_-]{8})",
    "/api/paste",
  ],
};

export function proxy(request: NextRequest) {
  // Rate limiting: only POST /api/paste
  if (
    request.nextUrl.pathname === "/api/paste" &&
    request.method === "POST"
  ) {
    const ip = getClientIp(request);
    const result = checkRateLimit(ip);

    if (result.limited) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSeconds),
          },
        },
      );
    }
    return NextResponse.next();
  }

  // Existing 410 logic...
}
```

**Error response pattern** - from `app/api/paste/route.ts` (lines 13, 22-24):
```typescript
return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
return NextResponse.json(
  { error: "Content is required" },
  { status: 400 },
);
```
Standard pattern: `{ error: string }` JSON with HTTP status code

---

### `lib/rate-limiter.ts` (utility, request-response, create)

**Analog:** `lib/expiration.ts`

**Imports pattern** (expiration.ts lines 1-7):
```typescript
const EXPIRATION_SECONDS: Record<string, number | null> = {
  "1h": 3600,
  "1d": 86400,
  "1w": 604800,
  "1m": 2592000,
  "never": null,
};
```
Pattern: Module-level constants for configuration

**Export pattern** (expiration.ts lines 11-19):
```typescript
export function computeExpiresAt(
  createdAt: number,
  expiration: string,
): number | null {
  const seconds = EXPIRATION_SECONDS[expiration];
  if (seconds === undefined) return null;
  if (seconds === null) return null;
  return createdAt + seconds;
}
```
Pattern: Pure functions with explicit return types, early returns

**Core pattern for rate-limiter** (from RESEARCH.md lines 482-516):
```typescript
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, windowMs);
  cleanupInterval.unref();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { limited: false, retryAfterSeconds: 0 };
      }

      entry.count++;

      if (entry.count > maxRequests) {
        const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
        return { limited: true, retryAfterSeconds };
      }

      return { limited: false, retryAfterSeconds: 0 };
    },
  };
}
```

**SOLID principles:**
- **SRP:** Rate limiter is a single module focused only on rate limiting logic
- **OCP:** Factory function pattern allows extension (could create different limiters with different thresholds)
- **DIP:** Proxy depends on the rate limiter interface (`RateLimitResult`), not implementation details

---

### `tests/lib/rate-limiter.test.ts` (test, create)

**Analog:** `tests/lib/expiration.test.ts`

**Test structure pattern** (lines 1-32):
```typescript
import { describe, it, expect } from "vitest";
import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";

describe("expiration utility", () => {
  it("STOR-02: VALID_EXPIRATIONS contains all expected values", () => {
    expect(VALID_EXPIRATIONS).toEqual(["1h", "1d", "1w", "1m", "never"]);
  });

  it("STOR-02: computeExpiresAt with 1h returns createdAt + 3600", () => {
    expect(computeExpiresAt(1000, "1h")).toBe(4600);
  });

  it("STOR-02: computeExpiresAt with never returns null", () => {
    expect(computeExpiresAt(1000, "never")).toBeNull();
  });

  it("STOR-02: computeExpiresAt with invalid value returns null", () => {
    expect(computeExpiresAt(1000, "invalid")).toBeNull();
  });
});
```

**Pattern to follow:**
- Import `{ describe, it, expect }` from vitest
- Import functions under test with `@/` path alias
- Use `describe()` blocks for module grouping
- Use `it()` for individual test cases
- Prefix test names with REQ-ID when testing requirements (e.g., "SECU-03: ...")
- Use descriptive test names that explain what's being tested
- Keep tests simple and focused on one behavior

**Rate limiter test pattern** (from RESEARCH.md lines 520-552):
```typescript
import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rate-limiter";

describe("createRateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      const result = limiter.check("192.168.1.1");
      expect(result.limited).toBe(false);
    }
  });

  it("blocks requests over the limit", () => {
    const limiter = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      limiter.check("192.168.1.1");
    }
    const result = limiter.check("192.168.1.1");
    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks IPs independently", () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.check("192.168.1.1");
    const result = limiter.check("192.168.1.2");
    expect(result.limited).toBe(false);
  });
});
```

---

### `tests/security/headers.test.ts` (test, request-response, create)

**Analog:** `tests/api/paste.test.ts`

**Test structure for API integration tests** (lines 1-45):
```typescript
import { describe, it, expect, afterEach } from "vitest";
import { POST } from "@/app/api/paste/route";
import { GET } from "@/app/api/paste/[id]/route";
import { db } from "@/lib/db";
import { pastes } from "@/lib/db/schema";

// Track created paste IDs for cleanup
const createdIds: string[] = [];

afterEach(() => {
  // Clean up any test pastes
  for (const id of createdIds) {
    db.delete(pastes).where(like(pastes.id, id)).run();
  }
  createdIds.length = 0;
});

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/paste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/paste", () => {
  it("CORE-01: creates a paste and returns id + url", async () => {
    const request = makePostRequest({ content: "Hello world" });
    const response = await POST(request);

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe("string");
  });
});
```

**Pattern to follow:**
- Import route handlers directly for testing
- Use helper functions to create Request objects (`makeRequest`)
- Test HTTP status codes with `expect(response.status).toBe()`
- Test response headers with `response.headers.get()`
- Use `afterEach()` for cleanup when needed
- Prefix test names with REQ-ID (SECU-02, SECU-03)

**Headers test pattern** (inferred from patterns):
```typescript
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/paste/route";

describe("Security Headers - SECU-02", () => {
  it("SECU-02: all responses include CSP header", async () => {
    const request = new Request("http://localhost/api/paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "test" }),
    });
    const response = await POST(request);
    
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
  });

  it("SECU-02: all responses include X-Content-Type-Options", async () => {
    const request = new Request("http://localhost/api/paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "test" }),
    });
    const response = await POST(request);
    
    const nosniff = response.headers.get("X-Content-Type-Options");
    expect(nosniff).toBe("nosniff");
  });
});
```

**Note:** Testing headers added via `next.config.ts` `headers()` may require integration testing through actual Next.js server or manual verification, as unit tests may not reflect the full middleware chain.

---

## Shared Patterns

### Error Response Format
**Source:** `app/api/paste/route.ts` (lines 13, 22-24, 30-32)
**Apply to:** Rate limit 429 response in `app/proxy.ts`

```typescript
return NextResponse.json({ error: "Error message here" }, { status: 400 });
```

Pattern: All JSON error responses use `{ error: string }` with appropriate HTTP status code.

### TypeScript Path Aliases
**Source:** All lib and test files
**Apply to:** All new files

```typescript
import { createPaste } from "@/lib/db/queries";
import { computeExpiresAt } from "@/lib/expiration";
```

Pattern: Use `@/` alias for absolute imports from project root.

### Constants Configuration
**Source:** `lib/expiration.ts` (lines 1-7), `app/api/paste/route.ts` (line 6)
**Apply to:** `lib/rate-limiter.ts`

```typescript
const MAX_CONTENT_BYTES = 512 * 1024; // 512KB
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5;
```

Pattern: Module-level constants with inline comments explaining values.

### Vitest Imports
**Source:** All test files
**Apply to:** All new test files

```typescript
import { describe, it, expect } from "vitest";
```

Pattern: Import only needed Vitest functions, not `*`.

---

## No Analog Found

All files have close matches in the codebase. No files require relying solely on RESEARCH.md patterns.

---

## Metadata

**Analog search scope:** 
- `next.config.ts` (project root)
- `app/proxy.ts` (middleware)
- `lib/*.ts` (utility modules)
- `tests/**/*.test.ts` (test files)

**Files scanned:** 8 analog files examined
- `next.config.ts` (1 line read)
- `app/proxy.ts` (32 lines read)
- `lib/expiration.ts` (20 lines read)
- `tests/lib/expiration.test.ts` (32 lines read)
- `tests/api/paste.test.ts` (292 lines read)
- `app/api/paste/route.ts` (76 lines read)

**Pattern extraction date:** 2026-05-14

**Key patterns identified:**
1. **Config extension pattern:** Extend existing `next.config.ts` by adding properties, maintain TypeScript typing
2. **Proxy middleware pattern:** Export `config` with `matcher`, export `proxy()` function with early returns
3. **Utility module pattern:** Pure functions with TypeScript types, module-level constants
4. **Test structure pattern:** Vitest with describe/it blocks, REQ-ID prefixes, helper functions for setup
5. **Error response pattern:** Consistent `{ error: string }` JSON format across all API errors
6. **SOLID adherence:** Single-responsibility modules, dependency injection via imports
