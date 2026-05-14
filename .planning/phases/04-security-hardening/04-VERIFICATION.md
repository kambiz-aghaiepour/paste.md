---
phase: 04-security-hardening
verified: 2026-05-14T16:30:00Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Verify CSP headers in browser DevTools"
    expected: "Content-Security-Policy header visible with strict directives on all responses"
    why_human: "Visual confirmation of headers in Network tab required for production deployment"
  - test: "Verify pages render correctly under CSP enforcement"
    expected: "No blank pages, no critical CSP errors blocking functionality"
    why_human: "Visual rendering and console error inspection cannot be automated"
  - test: "Verify Markdown and Shiki syntax highlighting work under CSP"
    expected: "Paste pages render Markdown formatting and code highlighting correctly"
    why_human: "Visual quality of rendering requires human judgment"
  - test: "Test rate limiting with rapid requests"
    expected: "First 5 POST /api/paste succeed, 6th returns 429 with retry timing"
    why_human: "Real-world browser testing of rate limiting behavior"
---

# Phase 04: Security Hardening Verification Report

**Phase Goal:** The service is hardened against common web attacks and abuse before public deployment
**Verified:** 2026-05-14T16:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                          | Status     | Evidence                                                                 |
| --- | ---------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| 1   | All HTTP responses include a Content-Security-Policy header with strict directives            | ✓ VERIFIED | next.config.ts headers() with CSP directives, integration test passes    |
| 2   | Supplementary security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)     | ✓ VERIFIED | next.config.ts securityHeaders array, 3 integration tests pass           |
| 3   | Browser executes scripts under strict CSP without requiring unsafe-inline in production       | ✓ VERIFIED | isDev conditional excludes unsafe-inline in prod, SRI enabled sha256     |
| 4   | Rate limiter correctly allows requests under threshold and blocks requests over threshold     | ✓ VERIFIED | Unit tests: allows 5, blocks 6th — 2 tests pass                          |
| 5   | Rate limiter tracks IPs independently                                                          | ✓ VERIFIED | Unit test: check(ip-a) and check(ip-b) both allowed — test passes        |
| 6   | Rate-limited requests receive retry timing indicating when the client can try again           | ✓ VERIFIED | Retry-After header in proxy.ts, integration test verifies positive value |
| 7   | Expired rate limit entries are cleaned up to prevent memory leaks                             | ✓ VERIFIED | setInterval cleanup with .unref(), unit test verifies cleanup            |
| 8   | POST /api/paste is rate-limited: 6th request within 60 seconds from same IP returns 429       | ✓ VERIFIED | Integration test: 5 allowed, 6th returns 429 — test passes               |
| 9   | 429 response body is JSON { error: 'Rate limit exceeded. Try again later.' }                  | ✓ VERIFIED | Integration test verifies exact error message                            |
| 10  | 429 response includes Retry-After header with positive integer seconds                        | ✓ VERIFIED | Integration test verifies header presence and positive value             |
| 11  | GET requests to /api/paste are not rate-limited                                               | ✓ VERIFIED | Integration test: 10 GET requests all pass through                       |
| 12  | Paste slug routes still return 410 for expired pastes                                         | ✓ VERIFIED | Existing proxy logic preserved after rate limiting block                 |
| 13  | Rate limiter extracts client IP from x-forwarded-for header first entry                       | ✓ VERIFIED | getClientIp function in proxy.ts, split on comma, trim first entry       |
| 14  | CSP header is present on API responses                                                        | ✓ VERIFIED | Integration test calls headers() and verifies CSP present                |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact                             | Expected                                                     | Status     | Details                                                      |
| ------------------------------------ | ------------------------------------------------------------ | ---------- | ------------------------------------------------------------ |
| `next.config.ts`                     | CSP headers, supplementary security headers, SRI config      | ✓ VERIFIED | 41 lines, contains all 4 security headers, SRI sha256        |
| `lib/rate-limiter.ts`                | In-memory rate limiter factory function                      | ✓ VERIFIED | 48 lines, exports createRateLimiter and RateLimitResult      |
| `tests/lib/rate-limiter.test.ts`     | Unit tests for rate limiter                                  | ✓ VERIFIED | 82 lines, 6 SECU-03 tests, all pass                          |
| `app/proxy.ts`                       | Rate limiting on POST /api/paste, existing 410 logic intact  | ✓ VERIFIED | 74 lines, imports rate limiter, wires to POST /api/paste     |
| `tests/security/headers.test.ts`     | Integration tests for rate limiting and CSP verification     | ✓ VERIFIED | 161 lines, 6 SECU-03 + 4 SECU-02 tests, all pass             |

### Key Link Verification

| From                      | To                                | Via                                | Status   | Details                                                          |
| ------------------------- | --------------------------------- | ---------------------------------- | -------- | ---------------------------------------------------------------- |
| `next.config.ts`          | All HTTP responses                | Next.js headers() config           | ✓ WIRED  | headers() function with source "/(.*)" applies to all routes     |
| `lib/rate-limiter.ts`     | `app/proxy.ts`                    | import createRateLimiter           | ✓ WIRED  | Line 4: import statement, Line 13: createRateLimiter(5, 60_000) |
| `app/proxy.ts`            | POST /api/paste route             | proxy matcher intercepts           | ✓ WIRED  | matcher includes "/api/paste", method check on line 26-28        |
| `app/proxy.ts`            | x-forwarded-for header            | getClientIp function               | ✓ WIRED  | Lines 15-21: extract first IP from header, fallback "unknown"    |

### Data-Flow Trace (Level 4)

| Artifact                  | Data Variable         | Source                          | Produces Real Data | Status       |
| ------------------------- | --------------------- | ------------------------------- | ------------------ | ------------ |
| `app/proxy.ts`            | rateLimiter.check()   | lib/rate-limiter.ts Map store   | Yes                | ✓ FLOWING    |
| `next.config.ts`          | securityHeaders       | Static config array             | Yes                | ✓ FLOWING    |

### Behavioral Spot-Checks

| Behavior                                            | Command                                                     | Result          | Status  |
| --------------------------------------------------- | ----------------------------------------------------------- | --------------- | ------- |
| Rate limiter allows 5 requests, blocks 6th          | npx vitest run tests/lib/rate-limiter.test.ts               | 6 passed (6)    | ✓ PASS  |
| Rate limiting integration and CSP config            | npx vitest run tests/security/headers.test.ts               | 10 passed (10)  | ✓ PASS  |
| All Phase 04 tests                                  | npx vitest run tests/lib/rate-limiter.test.ts tests/security/headers.test.ts | 16 passed (16)  | ✓ PASS  |

### Requirements Coverage

| Requirement | Source Plan   | Description                                                       | Status      | Evidence                                                              |
| ----------- | ------------- | ----------------------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| SECU-02     | 04-01, 04-02  | Application serves strict Content Security Policy headers        | ✓ SATISFIED | next.config.ts with CSP + SRI, 4 integration tests verify headers     |
| SECU-03     | 04-01, 04-02  | Paste creation is rate-limited per IP address                    | ✓ SATISFIED | Rate limiter module + proxy integration, 12 tests verify behavior     |

### Anti-Patterns Found

None found.

All files scanned for:
- Debt markers (TBD, FIXME, XXX, TODO, HACK): None found
- Stub patterns (empty returns, hardcoded empty data): None found
- Unreferenced cleanup needed: None found

### Human Verification Required

#### 1. Verify CSP headers in browser DevTools

**Test:** 
1. Start dev server: `npm run dev`
2. Open http://localhost:3000 in browser
3. Open DevTools → Network tab
4. Reload the page and inspect the document request
5. Check Response Headers section

**Expected:** 
- Content-Security-Policy header present containing "default-src 'self'" and "script-src 'self'"
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin

**Why human:** Visual confirmation of headers in production-like environment required. Network panel inspection cannot be automated.

#### 2. Verify pages render correctly under CSP enforcement

**Test:**
1. With dev server running, navigate to home page and create a paste
2. Visit the paste page
3. Check browser console for CSP violation errors (red errors, not warnings)
4. Verify page is not blank and all UI elements are visible

**Expected:**
- No blank pages
- No critical CSP errors blocking functionality
- Some dev-mode warnings are acceptable (React DevTools uses eval)
- All paste content renders correctly

**Why human:** Visual rendering quality and console error interpretation require human judgment. Automated tests cannot detect subtle layout breakage or distinguish critical vs. non-critical CSP warnings.

#### 3. Verify Markdown and Shiki syntax highlighting work under CSP

**Test:**
1. Create a paste with Markdown content including code blocks:
   ````markdown
   # Test Heading
   
   ```javascript
   function test() {
     console.log("Hello");
   }
   ```
   ````
2. View the paste page
3. Verify heading renders as `<h1>` with proper styling
4. Verify code block has syntax highlighting (colored keywords)

**Expected:**
- Markdown formatting (headings, bold, lists) renders correctly
- Code blocks display with syntax highlighting colors
- No missing styles or plain-text code blocks

**Why human:** Visual quality of syntax highlighting and Markdown rendering requires human judgment. Color perception and style correctness cannot be programmatically verified.

#### 4. Test rate limiting with rapid requests

**Test:**
1. With dev server running, open browser console
2. Run this script to send 6 rapid POST requests:
   ```javascript
   for (let i = 0; i < 6; i++) { 
     fetch('/api/paste', { 
       method: 'POST', 
       headers: {'Content-Type': 'application/json'}, 
       body: JSON.stringify({content: 'test ' + i}) 
     }).then(r => console.log('Request ' + (i+1) + ': ' + r.status)); 
   }
   ```
3. Check console output

**Expected:**
- First 5 requests return status 201 (created)
- 6th request returns status 429 (rate limited)
- Console shows rate limit message on 6th request

**Why human:** Real-world browser behavior testing. Automated tests use mock requests; human verification confirms rate limiting works with actual browser fetch() calls and network stack.

---

## Summary

**All 14 automated verification checks passed.** Phase 04 successfully implements:

1. **Content Security Policy (SECU-02):** Strict CSP headers configured in next.config.ts with:
   - `default-src 'self'` — only same-origin resources allowed by default
   - `script-src 'self'` — only same-origin scripts (dev mode adds unsafe-eval/unsafe-inline for HMR)
   - `style-src 'self' 'unsafe-inline'` — allows Shiki inline styles
   - `frame-ancestors 'none'` — prevents clickjacking
   - SRI enabled with sha256 hashes for production script integrity
   - Supplementary headers: X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Referrer-Policy (strict-origin-when-cross-origin)

2. **Rate Limiting (SECU-03):** IP-based rate limiting on paste creation with:
   - In-memory rate limiter module with fixed-window algorithm
   - 5 requests per 60 seconds per IP address
   - 429 response with retry timing when limit exceeded
   - IP extraction from x-forwarded-for header (reverse proxy compatible)
   - Automatic cleanup of expired entries to prevent memory leaks
   - Only POST /api/paste is rate-limited (GET requests pass through)

**Test Coverage:**
- 6 rate limiter unit tests (all pass)
- 10 security integration tests (all pass)
- 0 regressions in existing tests (1 pre-existing failure in Phase 3 cleanup test, unrelated to Phase 04 work)

**Human verification needed** for production deployment confidence:
- Visual confirmation of CSP headers in browser Network panel
- Page rendering quality under CSP enforcement
- Markdown and Shiki syntax highlighting visual quality
- Real-world rate limiting behavior with browser fetch() calls

**No gaps blocking phase completion.** All automated verification criteria met. Human verification required for production deployment confidence per plan checkpoint.

---

_Verified: 2026-05-14T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
