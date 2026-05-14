---
phase: 2
slug: markdown-rendering-editor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | vitest.config.ts |
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
| 02-01-01 | 01 | 1 | REND-01 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | REND-02 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | SECU-01 | T-02-01 | XSS prevented in rendered Markdown | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | EDIT-01 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | REND-03 | — | N/A | manual | Browser check | — | ⬜ pending |
| 02-02-03 | 02 | 2 | EDIT-02 | — | N/A | manual | Browser check | — | ⬜ pending |
| 02-02-04 | 02 | 2 | EDIT-03 | — | N/A | manual | Browser check | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/rendering/markdown.test.ts` — stubs for REND-01, REND-02, SECU-01
- [ ] Test fixtures with sample Markdown content (GFM tables, code blocks, task lists)

*Existing vitest infrastructure from Phase 1 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live preview updates as user types | REND-03 | Client-side rendering with debounce requires browser interaction | Type Markdown in editor, verify preview updates within ~300ms |
| localStorage draft persistence | EDIT-02 | Browser localStorage requires browser interaction | Type content, refresh page, verify content restored with indicator |
| Split-pane layout on desktop | EDIT-03 | Visual layout verification | Open on desktop viewport (≥768px), verify 50/50 split with editor left, preview right |
| Mobile toggle between edit/preview | EDIT-03 | Visual layout verification | Open on mobile viewport (<768px), verify toggle switches between edit and preview |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
