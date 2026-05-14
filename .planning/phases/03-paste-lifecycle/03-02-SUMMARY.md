---
phase: 03-paste-lifecycle
plan: 02
subsystem: api, testing
tags: [drizzle, sqlite, vitest, rest-api, bearer-auth, cleanup]

# Dependency graph
requires:
  - phase: 03-paste-lifecycle
    provides: Expiration utility (lib/expiration.ts), 410 handling in API routes, paste creation with expiration field
provides:
  - deleteExpiredPastes query function for batch cleanup
  - DELETE /api/cleanup endpoint with bearer token auth
  - Comprehensive test coverage for all Phase 3 requirements (STOR-02, STOR-03, STOR-04, REND-04)
affects: [04-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [bearer token auth for internal endpoints, env-based secret configuration, batch delete with row count return]

key-files:
  created:
    - app/api/cleanup/route.ts
    - tests/lib/expiration.test.ts
    - tests/api/cleanup.test.ts
  modified:
    - lib/db/queries.ts
    - tests/api/paste.test.ts
    - tests/lib/db.test.ts

key-decisions:
  - "Generic 401 for all auth failures on cleanup endpoint -- no distinction between missing/wrong secret (T-03-07 mitigation)"
  - "503 when CLEANUP_SECRET not configured -- signals misconfiguration vs auth failure"

patterns-established:
  - "Bearer token auth pattern: read env secret, compare Authorization header, generic 401 on failure"
  - "Test setup/teardown for env vars: save original in beforeEach, restore in afterEach"

requirements-completed: [STOR-02, STOR-03, STOR-04, REND-04]

# Metrics
duration: 2min
completed: 2026-05-14
---

# Phase 03 Plan 02: Cleanup Endpoint and Phase 3 Test Coverage Summary

**Background cleanup endpoint with bearer auth, deleteExpiredPastes batch query, and 45 passing tests covering all Phase 3 requirements**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-14T11:45:21Z
- **Completed:** 2026-05-14T11:47:43Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- deleteExpiredPastes query function batch-deletes expired rows using Drizzle and/lt/isNotNull operators, returns count
- DELETE /api/cleanup endpoint protected by CLEANUP_SECRET bearer token with 401/503 error handling
- 7 unit tests for expiration utility (STOR-02) covering all duration mappings and edge cases
- 4 integration tests for cleanup endpoint (STOR-04) covering auth gates and deletion behavior
- 6 new tests in paste.test.ts for expiration creation (STOR-02) and 410 expired paste responses (STOR-03)
- 1 new test in db.test.ts for deleteExpiredPastes (STOR-04)
- Full test suite: 45 tests passing across 6 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Cleanup query function, cleanup API route, and all automated tests** - `e0032f7` (feat)
2. **Task 2: Human verification of complete paste lifecycle** - Auto-approved (AUTO MODE)

## Files Created/Modified
- `lib/db/queries.ts` - Added deleteExpiredPastes function with and/lt/isNotNull from drizzle-orm
- `app/api/cleanup/route.ts` - DELETE endpoint with bearer token auth, 503 when unconfigured, 401 when unauthorized
- `tests/lib/expiration.test.ts` - 7 STOR-02 tests for computeExpiresAt and VALID_EXPIRATIONS
- `tests/api/cleanup.test.ts` - 4 STOR-04 tests for cleanup endpoint auth and deletion
- `tests/api/paste.test.ts` - Extended with 4 STOR-02 tests (expiration creation/validation) and 2 STOR-03 tests (410 expired)
- `tests/lib/db.test.ts` - Extended with 1 STOR-04 test for deleteExpiredPastes unit behavior

## Decisions Made
- Generic "Unauthorized" message for all auth failures on cleanup endpoint (missing header, wrong secret) per threat model T-03-07
- 503 status when CLEANUP_SECRET env var not configured to distinguish configuration issues from auth failures
- Test env var management using beforeEach/afterEach save/restore pattern for CLEANUP_SECRET

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The CLEANUP_SECRET env var is optional and only needed when deploying with a cron job for automated cleanup.

## Next Phase Readiness
- All Phase 3 requirements complete with automated test coverage
- 45 tests passing across 6 test files, zero regressions
- Ready for Phase 4 (polish/deployment)
- CLEANUP_SECRET needs to be set in production environment for automated cleanup

## Self-Check: PASSED

All files created/modified confirmed present. All commit hashes verified in git log.

---
*Phase: 03-paste-lifecycle*
*Completed: 2026-05-14*
