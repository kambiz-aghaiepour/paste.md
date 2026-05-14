# Phase 2: Markdown Rendering & Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 02-markdown-rendering-editor
**Areas discussed:** Rendering architecture, Live preview highlighting, Live preview strategy, Split-pane layout, localStorage persistence
**Mode:** --auto (all decisions auto-selected)

---

## Rendering Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side for paste view, client-side for preview | RSC + Shiki for paste view, Client Component + react-markdown for preview. Zero client JS on read-only views. | ✓ |
| Fully client-side | All rendering in Client Components. Simpler but ships JS for read-only paste views. | |
| Server-side preview via API | Preview calls server endpoint. More accurate but adds latency. | |

**User's choice:** [auto] Server-side for paste view, client-side for preview (recommended default)
**Notes:** Aligns with existing pattern where paste view is a Server Component and editor is a Client Component.

---

## Live Preview Highlighting

| Option | Description | Selected |
|--------|-------------|----------|
| No highlighting in preview | Code blocks render as plain styled pre/code. Full Shiki on saved paste view. | ✓ |
| highlight.js in preview | Lighter client-side highlighting. Moderate bundle size (~30KB). | |
| Full Shiki in preview | Same quality as paste view. Heavy client bundle (~1MB+). | |

**User's choice:** [auto] No highlighting in preview (recommended default)
**Notes:** STATE.md research gap flagged Shiki client bundle size. Researcher should validate. D-07 leaves door open for adding lightweight client highlighting later.

---

## Live Preview Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side debounced (~300ms) | react-markdown renders in browser, debounced on input. Instant feedback, no network. | ✓ |
| Server-side preview API | POST content to server, receive rendered HTML. More accurate but laggy. | |
| Throttled client-side | Similar to debounced but with fixed interval. Less responsive for fast typists. | |

**User's choice:** [auto] Client-side debounced (recommended default)
**Notes:** Client-side rendering avoids network latency and server load during editing.

---

## Split-Pane Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 50/50 desktop, stacked mobile with toggle | Simple, no resize complexity. Tailwind breakpoints for transition. | ✓ |
| Resizable drag handle | User controls split ratio. More complex, niche benefit. | |
| Tabs only (no side-by-side) | Edit and preview as separate tabs. Simpler but loses simultaneous view. | |

**User's choice:** [auto] Fixed 50/50 desktop, stacked mobile with toggle (recommended default)
**Notes:** Keeps implementation simple. Resizable drag handle adds complexity without proportional value for a pastebin.

---

## localStorage Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-save debounced (~1s), restore with indicator, clear on success | Seamless draft recovery. User sees "Draft restored" on reload. | ✓ |
| Manual save button | User explicitly saves drafts. Less friction on storage but easy to forget. | |
| Save on blur/unload | Saves when leaving page. Misses mid-session crashes. | |

**User's choice:** [auto] Auto-save debounced with restore indicator (recommended default)
**Notes:** Auto-save prevents accidental content loss. Clearing after successful paste creation avoids stale drafts.

---

## Claude's Discretion

- Shiki theme selection
- Debounce implementation details
- Tailwind breakpoint for desktop/mobile transition
- Preview toggle button placement and styling on mobile
- Draft restored indicator styling and auto-dismiss behavior
- react-markdown component structure and file organization

## Deferred Ideas

None -- all discussion stayed within phase scope.
