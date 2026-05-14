---
phase: 5
slug: ui-polish-experience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
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
| 05-01-01 | 01 | 1 | UI-04 | — | N/A | manual | Browser: toggle dark mode, verify all components render | — | ⬜ pending |
| 05-01-02 | 01 | 1 | UI-04 | — | N/A | manual | Browser: verify no FOWT on page load | — | ⬜ pending |
| 05-02-01 | 02 | 1 | UI-03 | — | N/A | manual | Browser: click copy button on code block, verify clipboard | — | ⬜ pending |
| 05-02-02 | 02 | 1 | UI-02 | — | N/A | manual | Browser: resize to mobile, verify code blocks scroll horizontally | — | ⬜ pending |
| 05-03-01 | 03 | 2 | UI-01 | — | N/A | manual | Browser: verify clean interface on all pages | — | ⬜ pending |
| 05-03-02 | 03 | 2 | UI-01, UI-02 | — | N/A | manual | Browser: verify all components have dark mode variants | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. UI polish is primarily visual — verified via browser testing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark mode toggle switches all components | UI-04 | Visual verification — colors, contrast, transitions | Toggle between light/dark mode, inspect each page |
| No flash of wrong theme on page load | UI-04 | Timing-dependent visual behavior | Hard refresh in both light and dark mode |
| Copy button copies code content | UI-03 | Clipboard API interaction | Click copy button, paste into text editor |
| Mobile code blocks scroll horizontally | UI-02 | Device-specific viewport behavior | Resize browser to 375px width, verify code block scrolls |
| Interface is clean and minimal | UI-01 | Subjective visual quality | Review all pages for clutter, spacing, alignment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
