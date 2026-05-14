# paste.md

## What This Is

A web-based pastebin that renders Markdown content. Users can create, share, and view pastes with full Markdown rendering including syntax highlighting, tables, and other formatting — turning raw text into beautiful, readable documents.

## Core Value

Users can quickly paste Markdown content and get a shareable link that renders it beautifully — zero friction from paste to share.

## Requirements

### Validated

- ✓ Create and share pastes via shareable URLs — Phase 1
- ✓ Markdown rendering for paste content — Phase 2
- ✓ Real-time Markdown preview while editing — Phase 2
- ✓ Syntax highlighting for code blocks — Phase 2
- ✓ Raw text view alongside rendered view — Phase 3
- ✓ Paste expiration controls — Phase 3
- ✓ Content Security Policy headers — Phase 4
- ✓ Rate limiting on paste creation — Phase 4

### Active

- [ ] Clean, minimal UI focused on content

### Out of Scope

- User accounts / authentication — anonymous-first for v1
- Paste editing after creation — immutable pastes for simplicity
- Real-time collaboration — single-author pastes only
- Mobile native app — web-first, responsive design covers mobile

## Context

Pastebin tools are well-established (Pastebin.com, GitHub Gists, HasteBin) but most either lack Markdown rendering or require authentication. paste.md fills the gap: a fast, anonymous, Markdown-native pastebin. The name "paste.md" directly communicates the value proposition.

## Constraints

- **Simplicity**: Minimal UI, no unnecessary features — paste and share
- **Performance**: Page load and rendering must feel instant
- **Accessibility**: Rendered output must be readable and accessible

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Anonymous-first (no auth) | Minimizes friction, fastest path to sharing | — Pending |
| Immutable pastes | Simplifies architecture, shareable links always work | — Pending |
| Markdown-native | Core differentiator vs existing pastebins | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-14 after Phase 4 completion*
