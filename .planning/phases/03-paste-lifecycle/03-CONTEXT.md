# Phase 3: Paste Lifecycle - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds paste lifecycle management: users choose how long their pastes live when creating them, expired pastes are handled gracefully (410 Gone), expired data is cleaned up automatically, and users can toggle between rendered Markdown and raw source on any paste page. No new content types, no editing, no authentication — just expiration controls and view modes.

</domain>

<decisions>
## Implementation Decisions

### Expiration Selector
- **D-01:** Add a dropdown (`<select>`) below the textarea in the paste creation form. Options: "Never", "1 hour", "1 day", "1 week", "1 month".
- **D-02:** Default selection is "Never" — matches current behavior where pastes don't expire. Least surprising for users.
- **D-03:** The selected expiration is sent to `POST /api/paste` as an `expiration` field (string value like `"1h"`, `"1d"`, `"1w"`, `"1m"`, `"never"`). The server calculates `expires_at` as a Unix timestamp from `created_at + duration`.

### Expired Paste Handling
- **D-04:** On-read expiration check: both the paste view page (`app/[slug]/page.tsx`) and the API route (`app/api/paste/[id]/route.ts`) check `expires_at` before serving. If `Date.now()/1000 > expires_at`, treat as expired.
- **D-05:** Expired pastes return HTTP 410 Gone. The paste view page shows a styled error page matching the app's design with a clear message: "This paste has expired." No details about when it expired or what it contained.
- **D-06:** The `getPasteById` query continues to return the row — expiration checking happens in the route/page layer, not the query layer. This keeps the data access layer simple and allows the cleanup job to handle actual deletion.

### Raw/Rendered Toggle
- **D-07:** Add a tab bar above the paste content on the paste view page with two tabs: "Rendered" (default) and "Raw". This mirrors the edit/preview toggle pattern established in Phase 2.
- **D-08:** Raw view displays paste content in a monospace `<pre>` block with no additional formatting, no line numbers. Clean and readable.
- **D-09:** The toggle is client-side state only — no URL change, no server roundtrip. Both views use the same paste data already fetched by the Server Component, passed to a Client Component wrapper that handles the tab switch.

### Background Cleanup
- **D-10:** Add a `deleteExpiredPastes()` function in `lib/db/queries.ts` that batch-deletes rows where `expires_at IS NOT NULL AND expires_at < current_timestamp`. Return the count of deleted rows.
- **D-11:** Expose cleanup via `DELETE /api/cleanup` route. Protected by a simple shared secret (environment variable `CLEANUP_SECRET`) compared via header `Authorization: Bearer <secret>`. Returns `{ deleted: number }`.
- **D-12:** Cleanup is triggered by an external cron (e.g., system cron, Railway cron, Docker healthcheck). No in-process scheduler — keeps the app stateless and simple. Recommended frequency: every hour.

### Claude's Discretion
- Tab bar styling and exact component structure for raw/rendered toggle
- Expiration dropdown styling and placement relative to the submit button
- 410 page layout and styling (keep it minimal, matching not-found page pattern)
- Whether to add the expiration period label on the paste view page (e.g., "Expires in 6 days")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` -- Project vision, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` -- Full requirements with REQ-IDs (STOR-02, STOR-03, STOR-04, REND-04 for this phase)

### Prior Phases
- `.planning/phases/01-foundation-data-path/01-CONTEXT.md` -- Phase 1 decisions (URL format D-02, API design D-08/D-09/D-10, schema D-05/D-06, validation D-11..D-16)
- `.planning/phases/02-markdown-rendering-editor/02-CONTEXT.md` -- Phase 2 decisions (rendering architecture D-01/D-02, split-pane D-10/D-11, typography D-16/D-17)

### Technology Stack
- `CLAUDE.md` -- Technology stack recommendations with versions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/db/schema.ts` -- `pastes` table already has `expiresAt` column (nullable integer, indexed via `idx_expires_at`). No migration needed.
- `lib/db/queries.ts` -- `getPasteById()` and `createPaste()` functions. Extend with `deleteExpiredPastes()`.
- `app/components/paste-form.tsx` -- Client Component with textarea, submit flow. Add expiration dropdown here.
- `app/[slug]/page.tsx` -- Server Component for paste view. Add expiration check and pass data to client toggle component.
- `app/not-found.tsx` -- Existing 404 page pattern to mirror for the 410 expired page.

### Established Patterns
- Server Components for data-fetching pages (paste view)
- Client Components with `"use client"` for interactive elements
- Tailwind utility classes for styling
- Fetch-based API calls from client to `/api/paste`
- `@/` path alias for imports
- Custom hooks in `lib/hooks/`
- Mobile toggle tabs pattern in `paste-form.tsx` (edit/preview)

### Integration Points
- `app/api/paste/route.ts` -- POST handler needs to accept `expiration` field and calculate `expiresAt`
- `app/api/paste/[id]/route.ts` -- GET handler needs expiration check, return 410 if expired
- `app/[slug]/page.tsx` -- needs expiration check + raw/rendered toggle wrapper
- `app/components/paste-form.tsx` -- needs expiration dropdown
- `lib/db/queries.ts` -- needs `deleteExpiredPastes()` function
- New: `app/api/cleanup/route.ts` -- cleanup endpoint
- New: `app/[slug]/gone.tsx` or inline 410 handling -- expired paste page

</code_context>

<specifics>
## Specific Ideas

- The `expiresAt` column and index already exist from Phase 1 D-06 -- no schema migration needed, just wire up the values
- The mobile edit/preview toggle pattern in paste-form.tsx is a good UX precedent for the rendered/raw toggle on paste pages
- The API already returns `expires_at` in the GET response -- clients can already see the field, it's just always null currently

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 3-Paste Lifecycle*
*Context gathered: 2026-05-14*
