---
phase: 02-markdown-rendering-editor
plan: 02
subsystem: ui
tags: [live-preview, split-pane, localStorage, debounce, client-components, mobile-toggle]

# Dependency graph
requires:
  - phase: 02-markdown-rendering-editor
    plan: 01
    provides: "react-markdown, remark-gfm, rehype-sanitize dependencies and @tailwindcss/typography plugin"
provides:
  - "useDebounce generic hook for value-based debouncing"
  - "useLocalStorageDraft hook for draft persistence with save/restore/clear"
  - "MarkdownPreview client component for live preview rendering"
  - "DraftIndicator component with auto-dismiss notification"
  - "Split-pane editor with 50/50 desktop layout and mobile toggle"
affects: [02-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [value-based-debounce, localStorage-draft-persistence, split-pane-responsive-grid, mobile-toggle-tabs]

key-files:
  created: [lib/hooks/use-debounce.ts, lib/hooks/use-local-storage-draft.ts, app/components/markdown-preview.tsx, app/components/draft-indicator.tsx]
  modified: [app/components/paste-form.tsx]

key-decisions:
  - "Value-based debounce pattern: debounce the value (not the callback) to avoid stale closure issues"
  - "Separate debounce intervals: 300ms for preview responsiveness, 1000ms for localStorage to reduce write frequency"
  - "MarkdownPreview uses same prose overrides as MarkdownRenderer for consistent styling (D-17)"

patterns-established:
  - "Custom hook pattern: lib/hooks/ directory with 'use client' directive and named exports"
  - "Value-based debounce: useDebounce returns debounced value, useEffect reacts to changes"
  - "localStorage safety: all operations wrapped in try/catch for SSR and private browsing compatibility"
  - "Responsive split-pane: grid grid-cols-1 md:grid-cols-2 with conditional hidden/md:block classes"

requirements-completed: [REND-03, EDIT-01, EDIT-02, EDIT-03]

# Metrics
duration: 2min
completed: 2026-05-14
---

# Phase 2 Plan 02: Live Preview, Split-Pane Editor, and Draft Persistence Summary

**Split-pane editor with 300ms debounced live Markdown preview, mobile edit/preview toggle, and localStorage draft persistence with auto-restore indicator**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-14T10:29:22Z
- **Completed:** 2026-05-14T10:31:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created useDebounce generic hook for value-based debouncing (300ms preview, 1000ms save)
- Created useLocalStorageDraft hook with save/restore/clear and full try/catch error safety
- Created MarkdownPreview client component using synchronous Markdown import with remark-gfm and rehype-sanitize
- Created DraftIndicator component with 3-second auto-dismiss and manual dismiss button
- Extended PasteForm with 50/50 split-pane grid layout, live preview, mobile toggle, and localStorage draft persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Create custom hooks and preview components** - `0eb4116` (feat)
2. **Task 2: Extend PasteForm with split-pane layout, live preview, and draft persistence** - `6baa1f0` (feat)

## Files Created/Modified
- `lib/hooks/use-debounce.ts` - Generic useDebounce<T> hook with useState + useEffect + clearTimeout cleanup
- `lib/hooks/use-local-storage-draft.ts` - useLocalStorageDraft hook with "paste-md-draft" key, restore on mount, save via useCallback, clear after submission
- `app/components/markdown-preview.tsx` - Client-side MarkdownPreview with Markdown (sync), remarkGfm, rehypeSanitize, prose overrides, aria-live="polite"
- `app/components/draft-indicator.tsx` - DraftIndicator with role="status", 3s auto-dismiss, dismiss button with aria-label
- `app/components/paste-form.tsx` - Extended with split-pane grid, mobile toggle, useDebounce x2, useLocalStorageDraft, DraftIndicator, MarkdownPreview, clearDraft on success

## Decisions Made
- Value-based debounce pattern chosen over callback-based to avoid stale closure issues (per RESEARCH.md Pitfall 6)
- Separate debounce intervals: 300ms for responsive preview, 1000ms for localStorage to reduce write frequency
- MarkdownPreview applies the same prose overrides (prose-a, prose-code, prose-pre, prose-img) as MarkdownRenderer for visual consistency per D-17
- Mobile toggle uses aria-pressed for accessibility per UI-SPEC Accessibility table

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All editor features are functional: split-pane layout, live preview, mobile toggle, localStorage persistence
- Plan 02-03 can test the editor features (useDebounce, useLocalStorageDraft, MarkdownPreview, DraftIndicator, PasteForm integration)
- The rendering pipeline is complete: server-side (MarkdownRenderer + Shiki) and client-side (MarkdownPreview without Shiki)

---
*Phase: 02-markdown-rendering-editor*
*Completed: 2026-05-14*
