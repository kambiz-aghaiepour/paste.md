# Phase 4: Security Hardening - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase hardens the service for public deployment with two security measures: strict Content Security Policy (CSP) headers on all responses to prevent unauthorized script/resource loading, and IP-based rate limiting on paste creation to prevent abuse. No new features, no UI changes, no authentication — just security hardening of the existing service.

</domain>

<decisions>
## Implementation Decisions

### Content Security Policy
- **D-01:** Configure CSP headers via `next.config.ts` `headers()` async function. The CSP policy is static (no nonces needed), so the config-based approach is simpler than middleware and applies to all routes automatically.
- **D-02:** Allow `'unsafe-inline'` for `style-src` only. Shiki generates inline `style` attributes on syntax-highlighted code blocks (Phase 2 D-05), and the 410 expired page in `proxy.ts` uses inline styles. Switching to class-based Shiki theming would be a large change for minimal security benefit — style-based XSS is not a practical attack vector in modern browsers.
- **D-03:** Use a strict policy: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self'`, `font-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. Researcher should validate these directives against actual Next.js runtime requirements (e.g., Next.js may need additional script-src entries for its runtime chunks).
- **D-04:** Deploy in enforcement mode (`Content-Security-Policy`), not report-only. The app has a controlled asset pipeline with no third-party scripts or resources — issues are predictable and easy to fix.

### Rate Limiting
- **D-05:** Rate limit only the `POST /api/paste` endpoint (paste creation). Read endpoints do not need rate limiting — they serve static content from SQLite and are inherently cheap.
- **D-06:** Use an in-memory sliding window rate limiter (Map keyed by IP). No new dependencies. Counters reset on server restart, which is acceptable — a restart is effectively a rate limit reset, and abuse detection starts fresh.
- **D-07:** Threshold: 5 paste creations per minute per IP. Low enough to prevent automated abuse, high enough that a human iterating rapidly won't hit it.
- **D-08:** Rate-limited requests return HTTP 429 with JSON `{ error: "Rate limit exceeded. Try again later." }` following the established API error pattern (Phase 1 D-16). Include a `Retry-After` header with seconds until the window resets.
- **D-09:** Implement rate limiting in the Next.js proxy (`app/proxy.ts`). The proxy runs before route handlers, allowing early rejection without touching the database or application logic. The proxy checks only `POST /api/paste` — all other requests pass through. *(Updated from original `middleware.ts` reference: Next.js 16 deprecated middleware.ts in favor of proxy.ts. The project already has `app/proxy.ts` with 410 expired paste logic, confirmed working.)*
- **D-10:** Extract client IP from `x-forwarded-for` header (for reverse proxy / Docker deployments) with fallback to `"unknown"`. Use the first IP in `x-forwarded-for` to avoid spoofing via appended headers. *(Updated: `request.ip` was removed in Next.js 15+; fallback is the string "unknown" rather than a nonexistent property.)*

### Claude's Discretion
- Exact sliding window algorithm implementation details (fixed window, sliding log, or token bucket)
- Whether to add `X-Content-Type-Options: nosniff` and other supplementary security headers alongside CSP
- Memory cleanup strategy for the rate limiter Map (periodic sweep of expired entries)
- Test approach for verifying CSP headers and rate limiting behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` -- Project vision, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` -- Full requirements with REQ-IDs (SECU-02, SECU-03 for this phase)

### Prior Phases
- `.planning/phases/01-foundation-data-path/01-CONTEXT.md` -- API error pattern D-16 (`{ error: string }` with HTTP status codes)
- `.planning/phases/02-markdown-rendering-editor/02-CONTEXT.md` -- Shiki inline styles D-05, rendering architecture D-01/D-02
- `.planning/phases/03-paste-lifecycle/03-CONTEXT.md` -- Cleanup endpoint auth pattern D-11/D-12

### Technology Stack
- `CLAUDE.md` -- Technology stack recommendations with versions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `next.config.ts` -- Currently minimal (`serverExternalPackages` only). Extend with `headers()` async function for CSP.
- `app/api/paste/route.ts` -- POST handler for paste creation. Rate limiting applies here (via proxy intercept, not in-handler).

### Established Patterns
- Route Handlers for API endpoints (`app/api/paste/route.ts`, `app/api/cleanup/route.ts`)
- JSON error responses with `{ error: string }` format and appropriate HTTP status codes
- `app/proxy.ts` exists with 410 expired paste logic — rate limiting expands this file
- `proxy.ts` uses inline styles for the 410 page — CSP must accommodate this

### Integration Points
- `next.config.ts` -- Add `headers()` function for CSP headers
- `app/proxy.ts` (existing) -- Expand with rate limiting logic alongside existing 410 logic
- `app/api/paste/route.ts` -- Target of rate limiting (POST only)

</code_context>

<specifics>
## Specific Ideas

- Shiki's inline styles are the main CSP constraint — `'unsafe-inline'` in `style-src` is the pragmatic choice that avoids a rendering pipeline overhaul
- The `x-forwarded-for` IP extraction must handle Docker/reverse proxy deployments where `request.ip` may be the proxy's IP
- Consider adding `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` alongside CSP as defense-in-depth (Claude's discretion)

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 4-Security Hardening*
*Context gathered: 2026-05-14*
