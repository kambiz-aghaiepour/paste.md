---
phase: 4
slug: security-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SECU-02 | T-04-01 | CSP header present on all responses | integration | `npx vitest run tests/security/headers.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | SECU-02 | T-04-02 | CSP directives match D-03 policy | integration | `npx vitest run tests/security/headers.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | SECU-02 | T-04-03 | Supplementary security headers present | integration | `npx vitest run tests/security/headers.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | SECU-03 | T-04-04 | Requests under limit pass through | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | SECU-03 | T-04-05 | Requests over limit return 429 | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 1 | SECU-03 | T-04-06 | Different IPs tracked independently | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-07 | 01 | 1 | SECU-03 | T-04-07 | 429 response includes Retry-After header | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-08 | 01 | 1 | SECU-03 | T-04-08 | Window resets after expiry | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-09 | 01 | 1 | SECU-03 | T-04-09 | Expired entries cleaned from memory | unit | `npx vitest run tests/lib/rate-limiter.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/rate-limiter.test.ts` — stubs for SECU-03 (rate limiter unit tests)
- [ ] `tests/security/headers.test.ts` — stubs for SECU-02 (CSP and security header verification)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSP blocks inline scripts in browser | SECU-02 | Browser-only CSP enforcement | Open browser dev tools → Console, check for CSP violation reports. Inject a `<script>` tag via paste content and verify it does not execute. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
