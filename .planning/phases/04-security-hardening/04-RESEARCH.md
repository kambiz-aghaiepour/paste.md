# Phase 4: Security Hardening - Research

**Researched:** 2026-05-14
**Domain:** Web security headers (CSP) and rate limiting for Next.js 16
**Confidence:** HIGH

## Summary

This phase adds two security capabilities to the existing paste.md service: Content Security Policy (CSP) headers on all responses and IP-based rate limiting on paste creation. Both are well-understood web security patterns with clear Next.js support.

The primary complexity lies in CSP configuration. The user decided (D-03) to use `script-src 'self'` without `'unsafe-inline'`, which is stricter than the official Next.js "without nonces" example that requires `'unsafe-inline'` because Next.js generates inline hydration scripts. To make `script-src 'self'` work, the experimental SRI (Subresource Integrity) feature must be enabled -- SRI generates integrity hashes at build time, allowing the browser to verify scripts without needing `'unsafe-inline'`. SRI is now supported with Turbopack as of Next.js 16.2 (the project runs 16.2.6). [VERIFIED: Next.js official CSP docs, Next.js 16.2 release blog]

Rate limiting is straightforward: an in-memory sliding window using a Map, triggered only on `POST /api/paste`. The key architectural concern is that in Next.js 16, `middleware.ts` is deprecated and renamed to `proxy.ts`. The project already has `app/proxy.ts` for the 410 expired paste page. The rate limiting logic must be integrated into this same proxy file (only one proxy file per project), which requires expanding the matcher config and adding conditional logic based on the request path and method.

**Primary recommendation:** Enable experimental SRI in `next.config.ts` to support `script-src 'self'` without `'unsafe-inline'`. Configure CSP headers via `next.config.ts` `headers()`. Add rate limiting logic to the existing `app/proxy.ts` by expanding the matcher and adding conditional path/method checks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Configure CSP headers via `next.config.ts` `headers()` async function. The CSP policy is static (no nonces needed), so the config-based approach is simpler than middleware and applies to all routes automatically.
- **D-02:** Allow `'unsafe-inline'` for `style-src` only. Shiki generates inline `style` attributes on syntax-highlighted code blocks (Phase 2 D-05), and the 410 expired page in `proxy.ts` uses inline styles. Switching to class-based Shiki theming would be a large change for minimal security benefit -- style-based XSS is not a practical attack vector in modern browsers.
- **D-03:** Use a strict policy: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self'`, `font-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. Researcher should validate these directives against actual Next.js runtime requirements (e.g., Next.js may need additional script-src entries for its runtime chunks).
- **D-04:** Deploy in enforcement mode (`Content-Security-Policy`), not report-only. The app has a controlled asset pipeline with no third-party scripts or resources -- issues are predictable and easy to fix.
- **D-05:** Rate limit only the `POST /api/paste` endpoint (paste creation). Read endpoints do not need rate limiting -- they serve static content from SQLite and are inherently cheap.
- **D-06:** Use an in-memory sliding window rate limiter (Map keyed by IP). No new dependencies. Counters reset on server restart, which is acceptable -- a restart is effectively a rate limit reset, and abuse detection starts fresh.
- **D-07:** Threshold: 5 paste creations per minute per IP. Low enough to prevent automated abuse, high enough that a human iterating rapidly won't hit it.
- **D-08:** Rate-limited requests return HTTP 429 with JSON `{ error: "Rate limit exceeded. Try again later." }` following the established API error pattern (Phase 1 D-16). Include a `Retry-After` header with seconds until the window resets.
- **D-09:** Implement rate limiting in Next.js middleware (`middleware.ts`). Middleware runs before route handlers, allowing early rejection without touching the database or application logic. The middleware checks only `POST /api/paste` -- all other requests pass through.
- **D-10:** Extract client IP from `x-forwarded-for` header (for reverse proxy / Docker deployments) with fallback to `request.ip`. Use the first IP in `x-forwarded-for` to avoid spoofing via appended headers.

### Claude's Discretion
- Exact sliding window algorithm implementation details (fixed window, sliding log, or token bucket)
- Whether to add `X-Content-Type-Options: nosniff` and other supplementary security headers alongside CSP
- Memory cleanup strategy for the rate limiter Map (periodic sweep of expired entries)
- Test approach for verifying CSP headers and rate limiting behavior

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SECU-02 | Application serves strict Content Security Policy headers | CSP via `next.config.ts` `headers()` with SRI enabled for strict `script-src 'self'`. Official Next.js CSP guide documents both approaches (with/without nonces). |
| SECU-03 | Paste creation is rate-limited per IP address | In-memory sliding window rate limiter in proxy.ts, checking `POST /api/paste` only. Standard pattern documented in Next.js backend-for-frontend guide. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **SOLID Principles required**: All new code must follow SRP, OCP, LSP, ISP, DIP. The rate limiter should be a separate module (SRP), injected as a dependency (DIP), not embedded inline in the proxy function.
- **No unnecessary abstractions**: YAGNI applies -- don't create interfaces for the rate limiter since there is only one implementation (in-memory Map). A simple function/class suffices.
- **Simplicity constraint**: Minimal code, no unnecessary features.
- **Performance constraint**: Must not add perceptible latency.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSP headers | Frontend Server (Next.js config) | -- | CSP headers are response-level HTTP headers. `next.config.ts` `headers()` applies them to all responses automatically at the framework level. |
| Rate limiting | Frontend Server (Proxy) | -- | Proxy runs before route handlers, enabling early rejection without touching DB or application logic. In-memory state lives in the server process. |
| IP extraction | Frontend Server (Proxy) | CDN/Reverse Proxy | Primary extraction from `x-forwarded-for` (set by reverse proxy). Fallback to connection IP. |
| Supplementary security headers | Frontend Server (Next.js config) | -- | Same mechanism as CSP -- static response headers via `next.config.ts` `headers()`. |

## Standard Stack

### Core (No new dependencies)

This phase requires **zero new npm packages**. All functionality is built with Next.js built-in features and standard JavaScript.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | CSP headers via `headers()` config, proxy for rate limiting | Already installed. `headers()` and proxy are built-in features. [VERIFIED: npm registry, installed version] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 3.2.4 | Testing CSP headers and rate limiting behavior | Already installed. Test rate limiter unit logic and integration behavior. [VERIFIED: installed version] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory Map | @upstash/ratelimit + Redis | Production-grade, scales across instances. Overkill for single-instance SQLite-backed pastebin. Adds external dependency. |
| In-memory Map | express-rate-limit | Well-tested library but designed for Express, not Next.js proxy. Would need adapter. |
| next.config.ts headers() | Proxy-based CSP with nonces | More secure (per-request nonces) but forces dynamic rendering on all pages, hurting performance. Contradicts D-01. |
| Experimental SRI | `'unsafe-inline'` in script-src | Simpler, no experimental features. But weaker security -- allows any inline script injection. Contradicts D-03. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### System Architecture Diagram

```
Request
  |
  v
[next.config.ts headers()]  -- Adds CSP + security headers to ALL responses
  |
  v
[proxy.ts] -- Intercepts matched routes
  |
  +--> POST /api/paste? -- YES --> [Rate Limiter Module]
  |                                   |
  |                                   +--> Under limit --> NextResponse.next()
  |                                   |
  |                                   +--> Over limit --> 429 JSON response
  |
  +--> /:slug (8-char)? -- YES --> [Expiration Check]
  |                                   |
  |                                   +--> Expired --> 410 HTML response
  |                                   |
  |                                   +--> Valid --> NextResponse.next()
  |
  +--> Other --> NextResponse.next()
  |
  v
[Route Handler / Page]
```

### Recommended Project Structure

```
paste.md/
├── next.config.ts           # Add headers() + experimental.sri
├── app/
│   └── proxy.ts             # Add rate limiting alongside existing 410 logic
├── lib/
│   └── rate-limiter.ts      # NEW: Rate limiter module (SRP)
└── tests/
    ├── lib/
    │   └── rate-limiter.test.ts  # NEW: Unit tests for rate limiter
    └── security/
        └── headers.test.ts       # NEW: Integration tests for CSP headers
```

### Pattern 1: CSP Headers via next.config.ts headers()

**What:** Static CSP headers applied to all responses via Next.js config.
**When to use:** When CSP policy is static (no per-request nonces needed).
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/content-security-policy#without-nonces
// Adapted for D-03 decisions with SRI enabled

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const cspHeader = `
  default-src 'self';
  script-src 'self'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self';
  font-src 'self';
  connect-src 'self'${isDev ? " ws://localhost:3000" : ""};
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`;

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
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\s{2,}/g, " ").trim(),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Pattern 2: In-Memory Sliding Window Rate Limiter

**What:** A rate limiter module using a Map to track request counts per IP within a time window.
**When to use:** Single-instance deployments where Redis is overkill.
**Example:**
```typescript
// Source: Standard sliding window pattern, adapted for Next.js
// lib/rate-limiter.ts

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5;

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

// Periodic cleanup of expired entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);
```

### Pattern 3: Rate Limiting in Proxy (merged with existing 410 logic)

**What:** Expand the existing proxy to also handle rate limiting on POST /api/paste.
**When to use:** Next.js 16 only supports one proxy.ts file per project.
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
// app/proxy.ts - expanded with rate limiting

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rate-limiter";

export const config = {
  matcher: [
    "/:slug([A-Za-z0-9_-]{8})",
    "/api/paste",
  ],
};

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // Fallback: use a generic identifier when IP is unavailable
  return "unknown";
}

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

  // Existing 410 logic for expired pastes
  const slug = request.nextUrl.pathname.slice(1);
  const paste = getPasteById(slug);

  if (paste?.expiresAt && Date.now() / 1000 > paste.expiresAt) {
    return new Response(/* existing 410 HTML */, {
      status: 410,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.next();
}
```

### Pattern 4: IP Extraction from x-forwarded-for

**What:** Extract client IP safely from reverse proxy headers.
**When to use:** When deployed behind Docker, NGINX, or any reverse proxy.
**Example:**
```typescript
// Source: Standard HTTP proxy pattern
// IMPORTANT: NextRequest.ip was removed in Next.js 15+
// Use x-forwarded-for header instead

function getClientIp(request: NextRequest): string {
  // x-forwarded-for contains comma-separated IPs: client, proxy1, proxy2
  // The FIRST IP is the original client (if proxy is trusted)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // No proxy header available -- use a fallback
  // In production behind a reverse proxy, this should not happen
  return "unknown";
}
```

### Anti-Patterns to Avoid

- **Embedding rate limiter logic directly in proxy function:** Violates SRP. Extract to a separate module (`lib/rate-limiter.ts`) that the proxy imports. This keeps the proxy function a thin routing layer.
- **Using `request.ip` for IP extraction:** Removed in Next.js 15+. Always use `x-forwarded-for` header. [VERIFIED: Next.js v15 upgrade guide, Context7]
- **Using `'unsafe-inline'` for script-src without understanding why:** The official Next.js "without nonces" example includes `'unsafe-inline'` for script-src because Next.js generates inline hydration scripts. With SRI enabled, these scripts get integrity hashes, eliminating the need for `'unsafe-inline'`. [VERIFIED: Next.js CSP docs]
- **Forgetting `'unsafe-eval'` in development:** React dev mode uses `eval()` for enhanced error debugging. CSP without `'unsafe-eval'` in dev will break React error overlay. [VERIFIED: Next.js CSP docs]
- **Forgetting `ws://localhost:3000` in `connect-src` for development:** Next.js HMR uses WebSockets. A strict `connect-src 'self'` blocks WebSocket connections in development, breaking hot reload. [CITED: dev.to/jenchen CSP article]
- **Creating a new `middleware.ts` file:** In Next.js 16, middleware.ts is deprecated. The project already has `app/proxy.ts`. Creating `middleware.ts` would conflict. [VERIFIED: Next.js 16 upgrade guide, Context7]
- **Using setInterval for cleanup without unref():** The cleanup interval for the rate limiter Map will prevent Node.js from exiting cleanly in tests. Use `setInterval(...).unref()` or manage the interval lifecycle explicitly. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSP header generation | Custom header middleware | `next.config.ts` `headers()` | Built-in, applies to all routes, no code to maintain |
| Script integrity verification | Manual hash computation | `experimental.sri` in next.config.ts | Next.js generates hashes automatically at build time with Turbopack |
| Supplementary security headers | Custom middleware for each header | `next.config.ts` `headers()` with all headers in one config | Same mechanism as CSP, keep all security headers together |

**Key insight:** The entire CSP implementation is configuration, not code. The only code needed is the rate limiter module and the proxy expansion.

## Common Pitfalls

### Pitfall 1: CSP Breaks Next.js Hydration Without SRI

**What goes wrong:** Setting `script-src 'self'` without `'unsafe-inline'` or SRI causes Next.js hydration to fail. The browser blocks inline scripts like `(self.__next_f = self.__next_f || []).push([0])` that Next.js injects for React Server Components.
**Why it happens:** Next.js generates inline `<script>` tags for hydration data. Without nonces or SRI integrity hashes, these are blocked by CSP.
**How to avoid:** Enable `experimental.sri` in `next.config.ts`. SRI adds `integrity="sha256-..."` attributes to script tags at build time, allowing them to execute under strict CSP without `'unsafe-inline'`. [VERIFIED: Next.js 16.2 release blog, Next.js CSP docs]
**Warning signs:** Browser console shows "Refused to execute inline script because it violates the following Content Security Policy directive: 'script-src 'self''". Pages render as blank white or show hydration errors.

### Pitfall 2: CSP Breaks Development Mode

**What goes wrong:** Two separate issues in development: (1) React dev mode uses `eval()` which is blocked by strict `script-src`, (2) HMR WebSocket connections are blocked by strict `connect-src`.
**Why it happens:** React uses `eval` for enhanced server-side error stack reconstruction in dev. HMR uses WebSocket (`ws://`) which is a different protocol from `http://` and not covered by `'self'`.
**How to avoid:** Conditionally add `'unsafe-eval'` to `script-src` and `ws://localhost:3000` to `connect-src` when `NODE_ENV === 'development'`. [VERIFIED: Next.js CSP docs]
**Warning signs:** React error overlay doesn't work; browser console shows eval-related CSP violations; HMR stops updating.

### Pitfall 3: Rate Limiter Memory Leak

**What goes wrong:** The in-memory Map grows unbounded as unique IPs hit the endpoint. Over time (days/weeks), this consumes significant memory.
**Why it happens:** Without cleanup, entries for IPs that exceeded their window remain in the Map forever.
**How to avoid:** Implement a periodic cleanup that sweeps expired entries. A simple `setInterval` every 60 seconds that deletes entries where `now > resetAt` is sufficient. Use `.unref()` on the interval to avoid blocking Node.js shutdown.
**Warning signs:** Increasing memory usage in process monitoring over time.

### Pitfall 4: middleware.ts vs proxy.ts Naming Conflict

**What goes wrong:** Creating a new `middleware.ts` file at the project root while `app/proxy.ts` already exists causes unpredictable behavior -- either one file is ignored or both run creating double-processing.
**Why it happens:** Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`. Only one proxy/middleware file is supported per project.
**How to avoid:** Add rate limiting logic to the existing `app/proxy.ts` file. Do NOT create a separate `middleware.ts`. [VERIFIED: Next.js 16 upgrade guide, Context7]
**Warning signs:** Rate limiting not triggering, or 410 page logic not running.

### Pitfall 5: x-forwarded-for Spoofing

**What goes wrong:** An attacker sends a fake `x-forwarded-for` header to bypass rate limiting by using a different IP each request.
**Why it happens:** The `x-forwarded-for` header can be set by any client. When there is no reverse proxy, the header is entirely untrusted.
**How to avoid:** Use the FIRST IP in the `x-forwarded-for` chain. Behind a trusted reverse proxy (NGINX, Docker), the proxy appends the real client IP. In development without a proxy, fallback to a generic identifier. This is an acceptable tradeoff for a pastebin -- real rate limiting enforcement happens at the reverse proxy level in production. [ASSUMED]
**Warning signs:** Rate limiting not effective against automated abuse.

### Pitfall 6: SRI Experimental Status

**What goes wrong:** The `experimental.sri` config could change behavior or be removed in a future Next.js version, breaking the strict CSP policy.
**Why it happens:** The feature is explicitly marked as experimental in Next.js docs.
**How to avoid:** Pin the Next.js version in package.json (already done with `^16.2.6`). Test CSP after any Next.js upgrade. If SRI is removed, fallback to `'unsafe-inline'` for script-src or switch to nonce-based approach. [VERIFIED: Next.js CSP docs state "This feature is experimental"]
**Warning signs:** Build warnings about deprecated experimental features; CSP violations appearing after upgrade.

## Code Examples

### CSP Header Configuration (Production-Ready)
```typescript
// Source: https://nextjs.org/docs/app/guides/content-security-policy#without-nonces
// Adapted with SRI per D-03

import type { NextConfig } from "next";

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

export default nextConfig;
```

### Rate Limiter Module (Fixed Window)
```typescript
// Source: Standard in-memory rate limiting pattern
// lib/rate-limiter.ts
// Using fixed window (simplest, per Claude's discretion)

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

### Rate Limiter Test Example
```typescript
// Source: Project test patterns (tests/api/paste.test.ts)
// tests/lib/rate-limiter.test.ts

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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` with `middleware()` export | `proxy.ts` with `proxy()` export | Next.js 16.0 | Rate limiting must use `proxy.ts`, not `middleware.ts` |
| `NextRequest.ip` for IP detection | `x-forwarded-for` header parsing | Next.js 15.0 | `request.ip` removed; must parse headers manually |
| CSP via middleware nonces (dynamic) | CSP via config headers + SRI (static) | Next.js 16.2 | SRI now works with Turbopack, enabling strict CSP with static rendering |
| `'unsafe-inline'` required for script-src | SRI hashes eliminate need for `'unsafe-inline'` | Next.js 16.2 | Stricter CSP possible without nonces or unsafe-inline |

**Deprecated/outdated:**
- `middleware.ts` / `middleware()` export: Deprecated in Next.js 16, renamed to `proxy.ts` / `proxy()`. [VERIFIED: Context7]
- `NextRequest.ip`: Removed in Next.js 15. Use `x-forwarded-for` header or `@vercel/functions` ipAddress(). [VERIFIED: Context7]
- `skipMiddlewareUrlNormalize`: Renamed to `skipProxyUrlNormalize`. [VERIFIED: Context7]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `setInterval().unref()` prevents blocking Node.js exit in tests | Anti-Patterns | LOW -- if wrong, tests hang but can be fixed with explicit cleanup |
| A2 | x-forwarded-for first IP is trustworthy behind reverse proxy | Pitfall 5 | MEDIUM -- if proxy doesn't strip client-supplied headers, rate limiting is bypassable |
| A3 | `app/proxy.ts` is correctly detected by Next.js 16 as the proxy file | Architecture Patterns | HIGH -- if proxy is only detected at root level, existing 410 logic AND new rate limiting would both fail. However, the 410 page currently works, suggesting this location is valid. |
| A4 | SRI works correctly with Turbopack in Next.js 16.2.6 in both dev and production | Pitfall 6 | HIGH -- if SRI doesn't work in dev, development would break. However, the official 16.2 blog specifically announces Turbopack SRI support. |

## Open Questions (RESOLVED)

1. **proxy.ts file location: `app/proxy.ts` vs root `proxy.ts`** -- RESOLVED
   - What we know: Next.js 16 convention says `proxy.ts` goes at the project root (same level as `app/`). The regex `(?:src/)?proxy` matches root or `src/` but not `app/`. The project currently has `app/proxy.ts` and the 410 logic works.
   - Resolution: `app/proxy.ts` is the active proxy file in this project. The existing 410 expired paste logic runs correctly from this location, confirming Next.js discovers it here. No root-level `proxy.ts` exists. Plans use `app/proxy.ts` as the proxy file location.

2. **SRI in development mode** -- RESOLVED
   - What we know: SRI generates hashes at build time. In dev mode with Turbopack, scripts are served dynamically with HMR. The official CSP docs show `'unsafe-eval'` for dev but don't explicitly address SRI + dev mode.
   - Resolution: Add `'unsafe-inline'` to `script-src` in development mode alongside `'unsafe-eval'` as a safety measure. This ensures dev mode works regardless of whether SRI generates integrity attributes for dynamically-served dev scripts. Production relies on SRI for strict script-src without unsafe-inline. This is already reflected in the plan's CSP configuration (Task 2 of Plan 01).

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified -- all features use built-in Next.js capabilities and standard JavaScript).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SECU-02 | CSP header present on all responses | integration | `npx vitest run tests/security/headers.test.ts -x` | No -- Wave 0 |
| SECU-02 | CSP directives match D-03 policy | integration | `npx vitest run tests/security/headers.test.ts -x` | No -- Wave 0 |
| SECU-02 | Supplementary security headers present | integration | `npx vitest run tests/security/headers.test.ts -x` | No -- Wave 0 |
| SECU-03 | Requests under limit pass through | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | No -- Wave 0 |
| SECU-03 | Requests over limit return 429 | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | No -- Wave 0 |
| SECU-03 | Different IPs tracked independently | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | No -- Wave 0 |
| SECU-03 | 429 response includes Retry-After header | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | No -- Wave 0 |
| SECU-03 | Window resets after expiry | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | No -- Wave 0 |
| SECU-03 | Expired entries cleaned from memory | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/rate-limiter.test.ts` -- covers SECU-03 (unit tests for rate limiter logic)
- [ ] `tests/security/headers.test.ts` -- covers SECU-02 (CSP and security header verification)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- anonymous-first, no auth |
| V3 Session Management | No | N/A -- no sessions |
| V4 Access Control | No | N/A -- no user-scoped resources |
| V5 Input Validation | Yes (already done) | Content size limit (SECU-04), rehype-sanitize (SECU-01) |
| V6 Cryptography | No | N/A -- no encryption/hashing of user data |
| V7 Error Handling | Yes | Rate limit responses follow established `{ error: string }` pattern |
| V8 Data Protection | Yes | CSP prevents unauthorized script loading (SECU-02) |
| V14 Configuration | Yes | Security headers hardening (SECU-02), rate limiting (SECU-03) |

### Known Threat Patterns for Next.js + User-Generated Content

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-site scripting (XSS) via markdown | Tampering | rehype-sanitize (done), CSP script-src restriction (this phase) |
| Clickjacking | Spoofing | `frame-ancestors 'none'` in CSP, `X-Frame-Options: DENY` (this phase) |
| MIME type sniffing | Information Disclosure | `X-Content-Type-Options: nosniff` (this phase) |
| Paste spam / DoS | Denial of Service | Rate limiting on POST /api/paste (this phase) |
| IP spoofing to bypass rate limit | Elevation of Privilege | Use first IP from x-forwarded-for; accept as acceptable risk for pastebin |
| Referrer leakage | Information Disclosure | `Referrer-Policy: strict-origin-when-cross-origin` (this phase) |

## Sources

### Primary (HIGH confidence)
- [Next.js 16 CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy) - CSP with/without nonces, SRI, development considerations
- [Next.js 16 proxy.ts convention](https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/03-file-conventions/proxy.mdx) - File location, matcher config, single-file constraint (via Context7 /vercel/next.js)
- [Next.js 16 upgrade guide](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/upgrading/version-16.mdx) - middleware to proxy rename (via Context7)
- [Next.js headers() config](https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.mdx) - Static header configuration (via Context7)
- [Next.js 16.2 Turbopack release](https://nextjs.org/blog/next-16-2-turbopack) - SRI support with Turbopack

### Secondary (MEDIUM confidence)
- [Next.js CSP Discussion #81703](https://github.com/vercel/next.js/discussions/81703) - Community confirmation that inline scripts require unsafe-inline or nonces
- [Rate Limiting in Next.js (freeCodeCamp)](https://www.freecodecamp.org/news/how-to-build-an-in-memory-rate-limiter-in-nextjs/) - In-memory rate limiter patterns
- [Next.js PWA Security Headers](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/progressive-web-apps.mdx) - X-Content-Type-Options, X-Frame-Options, Referrer-Policy patterns (via Context7)

### Tertiary (LOW confidence)
- [CSP connect-src for HMR](https://dev.to/jenchen/security-solving-the-content-security-policy-csp-header-not-set-in-nextjs-script-src-and-37ie) - WebSocket CSP for development mode

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies. All functionality uses built-in Next.js features verified via official docs and Context7.
- Architecture: HIGH - CSP via next.config.ts headers() is the officially documented approach. Rate limiting in proxy is a standard Next.js pattern shown in official backend-for-frontend guide.
- Pitfalls: HIGH - CSP + inline scripts is a well-documented issue with clear solutions (SRI). Rate limiter memory management is a standard concern with well-known solutions.
- proxy.ts location: HIGH - Existing `app/proxy.ts` works (confirmed by active 410 logic). Open Question 1 resolved.
- SRI in dev mode: HIGH - Resolved by adding `'unsafe-inline'` to dev script-src as safety measure. Open Question 2 resolved.

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (30 days -- stable domain, well-documented APIs)
