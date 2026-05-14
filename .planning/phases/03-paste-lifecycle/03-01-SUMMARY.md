---
phase: 03-paste-lifecycle
plan: 01
subsystem: api, ui
tags: [nextjs, proxy, expiration, sqlite, tailwind, react]

# Dependency graph
requires:
  - phase: 01-project-setup
    provides: SQLite schema with expiresAt column and index, paste API routes, paste form
  - phase: 02-markdown-rendering-editor
    provides: MarkdownRenderer server component, paste-form with edit/preview toggle
provides:
  - Expiration utility (lib/expiration.ts) with duration-to-seconds mapping
  - Expiration validation and server-side expiresAt computation in POST /api/paste
  - 410 Gone responses for expired pastes in all three serving routes (proxy, JSON API, raw API)
  - PasteView client component with rendered/raw tab toggle
  - Expiration dropdown in paste creation form with 5 options
affects: [03-paste-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns: [proxy.ts for custom HTTP status codes, inline HTML responses outside React tree, client component view toggle wrapping server component output]

key-files:
  created:
    - lib/expiration.ts
    - app/proxy.ts
    - app/[slug]/components/paste-view.tsx
  modified:
    - app/api/paste/route.ts
    - app/api/paste/[id]/route.ts
    - app/api/paste/[id]/raw/route.ts
    - app/components/paste-form.tsx
    - app/[slug]/page.tsx

key-decisions:
  - "proxy.ts with inline HTML for 410 page -- outside React tree, uses inline styles matching not-found.tsx visual pattern"
  - "formatRelativeTime helper inline in page.tsx -- simple enough to not warrant a separate utility file"

patterns-established:
  - "Expiration check pattern: if (paste.expiresAt && Date.now() / 1000 > paste.expiresAt) -- consistent across all routes"
  - "proxy.ts for custom HTTP status codes on page routes -- Next.js 16 pattern replacing middleware.ts"
  - "Client component wrapper receiving pre-rendered RSC output as renderedContent prop"

requirements-completed: [STOR-02, STOR-03, REND-04]

# Metrics
duration: 3min
completed: 2026-05-14
---

# Phase 03 Plan 01: Paste Lifecycle Summary

**Expiration dropdown on creation, 410 Gone for expired pastes via proxy.ts, and rendered/raw view toggle on paste pages**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-14T11:40:21Z
- **Completed:** 2026-05-14T11:42:52Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Users can select expiration period (1h, 1d, 1w, 1m, never) when creating pastes via a native dropdown
- Expired pastes return HTTP 410 Gone from all three serving routes: proxy.ts (page), JSON API, and raw API
- Paste view page has rendered/raw tab toggle matching the Phase 2 edit/preview pattern
- Expiration info displayed on paste pages ("Expires in X days/hours")

## Task Commits

Each task was committed atomically:

1. **Task 1: Expiration utility, API wiring, and form dropdown** - `4157106` (feat)
2. **Task 2: Proxy 410 page, PasteView toggle, and paste page wiring** - `a0171b8` (feat)

## Files Created/Modified
- `lib/expiration.ts` - Duration-to-seconds mapping utility with VALID_EXPIRATIONS and computeExpiresAt
- `app/proxy.ts` - Intercepts expired paste page requests, returns 410 with styled inline HTML
- `app/[slug]/components/paste-view.tsx` - Client component with rendered/raw tab toggle
- `app/api/paste/route.ts` - Accepts expiration field, validates against allowlist, computes expiresAt server-side
- `app/api/paste/[id]/route.ts` - Returns 410 JSON response for expired pastes
- `app/api/paste/[id]/raw/route.ts` - Returns 410 plain text response for expired pastes
- `app/components/paste-form.tsx` - Added expiration dropdown with 5 options in form footer row
- `app/[slug]/page.tsx` - Wraps content in PasteView, displays expiration countdown

## Decisions Made
- Used proxy.ts with inline HTML for 410 page (outside React tree, uses inline styles matching not-found.tsx visual pattern)
- formatRelativeTime helper placed inline in page.tsx rather than a separate utility file (simple enough for single use)
- Expiration dropdown placed in a flex row with the submit button, using ml-auto to push the button right

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Expiration infrastructure complete, ready for cleanup endpoint (Plan 02)
- deleteExpiredPastes query function needed in Plan 02
- PasteView toggle pattern established for future tab additions

## Self-Check: PASSED

All files created/modified confirmed present. All commit hashes verified in git log.

---
*Phase: 03-paste-lifecycle*
*Completed: 2026-05-14*
