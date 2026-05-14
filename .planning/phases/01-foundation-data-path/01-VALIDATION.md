---
phase: 1
slug: foundation-data-path
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (Plan 01-01, Task 1 installs and configures) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | CORE-01 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | CORE-02 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | CORE-04 | — | Slugs are random, not sequential | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | STOR-01 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | SECU-04 | — | Rejects content > 512KB | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | CORE-03 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `vitest` — installed by Plan 01-01, Task 1 (dev dependency)
- [x] `vitest.config.ts` — created by Plan 01-01, Task 1 (step 11)
- [ ] Test stubs for API routes and database operations — created by Plan 01-02, Task 1

*Wave 0 infrastructure (vitest install + config) is covered by Plan 01-01, Task 1. Test files themselves are created in Plan 01-02, Task 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pastes persist across server restarts | STOR-01 | Requires server restart | Create paste, restart server, verify paste accessible |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
