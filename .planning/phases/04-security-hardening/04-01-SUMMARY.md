---
phase: 04-security-hardening
plan: 01
subsystem: security
tags: [csp, rate-limiting, security-headers, sri]
dependency_graph:
  requires: []
  provides: [rate-limiter-module, csp-headers, sri-config]
  affects: [next.config.ts, lib/rate-limiter.ts]
tech_stack:
  added: []
  patterns: [factory-function, fixed-window-rate-limiting, setInterval-unref]
key_files:
  created:
    - lib/rate-limiter.ts
    - tests/lib/rate-limiter.test.ts
  modified:
    - next.config.ts
decisions:
  - "unsafe-inline added to script-src in dev mode because SRI does not generate integrity attributes for dynamically-served Turbopack scripts"
  - "style-src includes unsafe-inline in all environments for Shiki inline styles (D-02)"
  - "setInterval cleanup uses windowMs interval with .unref() to prevent blocking Node.js exit"
metrics:
  duration: 2min
  completed: "2026-05-14T14:17:05Z"
  tasks: 2
  files: 3
---

# Phase 04 Plan 01: CSP Headers and Rate Limiter Summary

In-memory rate limiter with factory pattern and strict CSP headers with SRI for script integrity verification.

## Task Results

| Task | Name | Commit(s) | Files |
|------|------|-----------|-------|
| 1 | Create rate limiter module with TDD | e8ac5a9 (RED), dde5bac (GREEN) | lib/rate-limiter.ts, tests/lib/rate-limiter.test.ts |
| 2 | Configure CSP headers, SRI, and supplementary security headers | 4cb4e88 | next.config.ts |

## What Was Built

### Rate Limiter Module (lib/rate-limiter.ts)
- `createRateLimiter(maxRequests, windowMs)` factory function returning `{ check(key): RateLimitResult }`
- Fixed-window algorithm with in-memory Map store
- Automatic cleanup of expired entries via `setInterval` with `.unref()` to prevent blocking Node.js exit
- `RateLimitResult` interface with `limited` boolean and `retryAfterSeconds` integer
- No new npm dependencies (D-06 compliance)
- Ready for proxy integration in Plan 02

### CSP and Security Headers (next.config.ts)
- Content-Security-Policy with strict directives: default-src, script-src, style-src, img-src, font-src, connect-src, frame-ancestors, base-uri, form-action
- SRI enabled via `experimental.sri: { algorithm: "sha256" }` for production script integrity
- Development mode exceptions: `unsafe-eval` and `unsafe-inline` for script-src, `ws://localhost:3000` for connect-src
- Supplementary headers: X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Referrer-Policy (strict-origin-when-cross-origin)
- All headers applied to every route via `async headers()` with source `/(.*)`
- Existing `serverExternalPackages: ["better-sqlite3"]` preserved

## TDD Gate Compliance

- RED gate: `test(04-01)` commit e8ac5a9 -- 6 failing tests written first
- GREEN gate: `feat(04-01)` commit dde5bac -- implementation passes all 6 tests
- REFACTOR gate: Not needed -- code was clean after GREEN phase

## Test Results

```
 6 passed (6) -- tests/lib/rate-limiter.test.ts
 7 passed (7) -- tests/lib/expiration.test.ts (no regressions)
```

## Decisions Made

1. Added `unsafe-inline` to dev-mode script-src because SRI does not apply to dynamically-served Turbopack dev scripts
2. `style-src 'self' 'unsafe-inline'` in all environments to support Shiki inline syntax highlighting styles (D-02)
3. Cleanup interval uses `windowMs` as the sweep period and `.unref()` to prevent blocking test/process exit

## Deviations from Plan

None -- plan executed exactly as written.

## Threat Mitigations Verified

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-04-01 | CSP script-src 'self' + SRI sha256 | Configured |
| T-04-02 | X-Content-Type-Options: nosniff | Configured |
| T-04-03 | frame-ancestors 'none' + X-Frame-Options: DENY | Configured |
| T-04-04 | Referrer-Policy: strict-origin-when-cross-origin | Configured |
| T-04-05 | Rate limiter module created (wiring in Plan 02) | Module ready |
| T-04-06 | IP spoofing accepted risk (documented) | Accepted |
