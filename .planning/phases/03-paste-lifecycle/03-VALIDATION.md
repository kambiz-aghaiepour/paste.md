---
phase: 3
slug: paste-lifecycle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
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
| 03-01-01 | 01 | 1 | STOR-02 | — | Validate expiration against allowlist | unit | `npx vitest run tests/lib/expiration.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | STOR-02 | — | Server computes expiresAt, not client | unit | `npx vitest run tests/api/paste.test.ts -t "STOR-02"` | ✅ | ⬜ pending |
| 03-01-03 | 01 | 1 | STOR-03 | — | 410 for expired pastes on all routes | unit | `npx vitest run tests/api/paste.test.ts -t "STOR-03"` | ✅ | ⬜ pending |
| 03-01-04 | 01 | 1 | STOR-04 | — | deleteExpiredPastes removes only expired rows | unit | `npx vitest run tests/lib/db.test.ts -t "STOR-04"` | ✅ | ⬜ pending |
| 03-01-05 | 01 | 1 | STOR-04 | — | Cleanup endpoint requires valid bearer secret | unit | `npx vitest run tests/api/cleanup.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | REND-04 | — | N/A | manual-only | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/expiration.test.ts` — stubs for STOR-02 duration mapping
- [ ] `tests/api/cleanup.test.ts` — stubs for STOR-04 cleanup endpoint

*Existing infrastructure covers STOR-02 (POST validation), STOR-03 (410 checks), STOR-04 (deleteExpiredPastes) via existing test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Raw/rendered toggle UI | REND-04 | Client-side state in Client Component; RSC+client interaction requires browser | 1. Create a paste with markdown content 2. Visit paste URL 3. Verify "Rendered" tab shows formatted markdown 4. Click "Raw" tab 5. Verify raw markdown source displays in monospace pre block 6. Toggle back to "Rendered" — verify it re-renders correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
