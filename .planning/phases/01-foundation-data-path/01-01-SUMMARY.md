---
phase: 01-foundation-data-path
plan: 01
subsystem: api, database
tags: [next.js, sqlite, drizzle-orm, better-sqlite3, nanoid, tailwindcss, biome, vitest]

# Dependency graph
requires:
  - phase: none
    provides: greenfield project
provides:
  - Next.js 16 project scaffold with TypeScript, Tailwind CSS 4, Turbopack
  - SQLite database with Drizzle ORM schema (pastes table with 5 columns)
  - Database connection singleton with WAL mode
  - POST /api/paste endpoint with content validation (empty, size limit)
  - GET /api/paste/[id] endpoint returning JSON
  - GET /api/paste/[id]/raw endpoint returning text/plain
  - PasteForm client component with error handling
  - Paste view page at /[slug] with Server Component
  - Global 404 not-found page
affects: [01-02, 02-markdown-rendering, 03-paste-lifecycle, 04-security-hardening]

# Tech tracking
tech-stack:
  added: [next.js 16.2.6, react 19.2, typescript, drizzle-orm 0.45.2, better-sqlite3 12.10.0, nanoid 5.1.11, tailwindcss 4.3, @tailwindcss/vite 4.3, drizzle-kit 0.31.10, @biomejs/biome, vitest]
  patterns: [database-singleton, drizzle-query-functions, route-handler-validation, server-component-data-fetch, async-params]

key-files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - app/globals.css
    - app/layout.tsx
    - app/page.tsx
    - app/not-found.tsx
    - app/components/paste-form.tsx
    - app/[slug]/page.tsx
    - app/api/paste/route.ts
    - app/api/paste/[id]/route.ts
    - app/api/paste/[id]/raw/route.ts
    - lib/db/schema.ts
    - lib/db/index.ts
    - lib/db/queries.ts
    - drizzle.config.ts
    - vitest.config.ts
    - biome.json
    - data/.gitkeep
    - .gitignore
  modified: []

key-decisions:
  - "Used manual project scaffold instead of create-next-app due to conflicting .planning/ and CLAUDE.md files"
  - "Set WAL mode at runtime in DB singleton rather than during drizzle-kit push"
  - "Used Route Handlers (not Server Actions) for paste creation per D-08 API spec"

patterns-established:
  - "Database singleton: lib/db/index.ts creates one Database instance with WAL + pragmas, reused across requests"
  - "Query functions: lib/db/queries.ts exports reusable typed functions (getPasteById, createPaste)"
  - "Route handler validation: parse JSON in try/catch, validate content type/presence/size before DB operations"
  - "Async params: all pages and route handlers await params (Next.js 16 Promise-based params)"
  - "Content rendering safety: user content rendered in pre/text nodes, never dangerouslySetInnerHTML"

requirements-completed: [CORE-01, CORE-02, CORE-03, CORE-04, STOR-01, SECU-04]

# Metrics
duration: 5min
completed: 2026-05-14
---

# Phase 01 Plan 01: Walking Skeleton Summary

**Next.js 16 walking skeleton with SQLite/Drizzle data layer and complete create-store-retrieve paste data path via three API endpoints**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-14T09:21:37Z
- **Completed:** 2026-05-14T09:26:52Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments
- Scaffolded complete Next.js 16 project with TypeScript, Tailwind CSS 4, Turbopack, Biome, and Vitest
- Established SQLite data layer with Drizzle ORM: pastes table with id, content, created_at, expires_at, size_bytes columns in WAL mode
- Built end-to-end paste creation and retrieval: form submission -> POST API -> DB insert -> redirect -> Server Component page render
- Implemented all three API endpoints with proper validation (empty content 400, oversized 413, invalid JSON 400, not found 404)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold project and data layer** - `dde6ab2` (feat)
2. **Task 2: Build complete create-view data path** - `9b0c355` (feat)

## Files Created/Modified
- `package.json` - Project manifest with all dependencies
- `tsconfig.json` - TypeScript config with @/* path alias
- `next.config.ts` - Next.js config with serverExternalPackages for better-sqlite3
- `app/globals.css` - Tailwind v4 CSS-first import
- `app/layout.tsx` - Root layout with html lang="en"
- `app/page.tsx` - Home page with PasteForm component
- `app/not-found.tsx` - Global 404 page
- `app/components/paste-form.tsx` - Client component with textarea, validation, fetch POST
- `app/[slug]/page.tsx` - Paste view Server Component with notFound()
- `app/api/paste/route.ts` - POST endpoint: create paste with size/content validation, nanoid collision retry
- `app/api/paste/[id]/route.ts` - GET endpoint: paste JSON retrieval
- `app/api/paste/[id]/raw/route.ts` - GET endpoint: raw text/plain retrieval
- `lib/db/schema.ts` - Drizzle schema: pastes table with idx_expires_at index
- `lib/db/index.ts` - Database connection singleton with WAL + pragmas
- `lib/db/queries.ts` - getPasteById and createPaste query functions
- `drizzle.config.ts` - Drizzle Kit config for SQLite
- `vitest.config.ts` - Vitest config with path aliases
- `biome.json` - Biome formatter/linter config
- `.gitignore` - Ignores node_modules, .next, data/*.db, drizzle/
- `data/.gitkeep` - Ensures data directory tracked by git

## Decisions Made
- Used manual project scaffold instead of create-next-app because existing .planning/ and CLAUDE.md files conflicted with create-next-app's directory check
- WAL mode is set at runtime in the DB singleton (lib/db/index.ts) rather than during drizzle-kit push, since drizzle-kit creates its own connection
- Used Route Handlers (fetch-based) for the paste creation form instead of Server Actions, per D-08 API specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `create-next-app` refused to run in a directory with existing files (.planning/, CLAUDE.md). Resolved by manually creating all project files instead, which produced an equivalent result.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All infrastructure is in place for Plan 01-02 (automated tests)
- The three API endpoints and paste view page are ready for integration testing
- Vitest is configured and ready for test files
- Database schema is created and operational with WAL mode

## Self-Check: PASSED

All 20 files verified present. Both task commits (dde6ab2, 9b0c355) verified in git log.

---
*Phase: 01-foundation-data-path*
*Completed: 2026-05-14*
