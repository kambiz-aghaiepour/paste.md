# Phase 4: Security Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 04-security-hardening
**Areas discussed:** CSP inline styles strategy, Rate limiter storage, Rate limit thresholds, CSP header delivery method
**Mode:** --auto (all decisions auto-selected)

---

## CSP Inline Styles Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Allow 'unsafe-inline' for style-src | Pragmatic — Shiki and proxy.ts rely on inline styles; style XSS is not practical in modern browsers | ✓ |
| Switch Shiki to class-based theming | Eliminates unsafe-inline but requires rendering pipeline changes and a CSS theme file | |
| Use CSP nonces | Most strict but complex — requires middleware to inject nonces into every response and coordinate with Shiki | |

**User's choice:** [auto] Allow 'unsafe-inline' for style-src only (recommended default)
**Notes:** Shiki (Phase 2 D-05) and the 410 page (proxy.ts) both use inline styles. Class-based theming would be a disproportionate change for this phase's scope.

---

## Rate Limiter Storage

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory sliding window (Map) | Simple, zero dependencies, resets on restart — sufficient for single-process deployment | ✓ |
| SQLite-based | Persists across restarts but adds write load to every paste creation request | |
| Redis | Not in stack, adds operational complexity for a pastebin | |

**User's choice:** [auto] In-memory sliding window (Map) (recommended default)
**Notes:** SQLite is already in the stack but adding writes to the rate limiting hot path is unnecessary. Counter reset on restart is acceptable behavior.

---

## Rate Limit Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| 5 per minute per IP | Conservative — prevents automated abuse while allowing rapid human iteration | ✓ |
| 10 per minute per IP | Moderate — more permissive for power users | |
| 20 per minute per IP | Lenient — mostly stops only aggressive automated abuse | |

**User's choice:** [auto] 5 per minute per IP (recommended default)
**Notes:** A human manually creating pastes is unlikely to exceed 5/min. Automated tools hitting the API can be tuned with env vars if needed (Claude's discretion).

---

## CSP Header Delivery Method

| Option | Description | Selected |
|--------|-------------|----------|
| next.config.ts headers() | Static config, applies to all routes automatically, simplest approach | ✓ |
| Next.js middleware | Dynamic, can inject nonces per-request, more complex | |

**User's choice:** [auto] next.config.ts headers() function (recommended default)
**Notes:** Since we chose 'unsafe-inline' for style-src (no nonces needed), the static config approach is sufficient. Middleware is only needed for the rate limiter.

---

## Claude's Discretion

- Exact sliding window algorithm (fixed window, sliding log, or token bucket)
- Supplementary security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Rate limiter Map cleanup strategy for expired entries
- Test approach for CSP headers and rate limiting

## Deferred Ideas

None — discussion stayed within phase scope
