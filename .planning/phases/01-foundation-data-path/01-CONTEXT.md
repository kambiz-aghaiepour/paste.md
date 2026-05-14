# Phase 1: Foundation & Data Path - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the core data path: users can create a paste (text content), store it in SQLite, and retrieve it via a unique shareable URL. No Markdown rendering, no styling, no expiration UI — just the create/store/retrieve pipeline with correct schema design. The paste view page displays raw content as plain text.

</domain>

<decisions>
## Implementation Decisions

### URL Slug Format
- **D-01:** Use nanoid (8 characters, URL-safe alphabet) for paste slugs. 281 trillion combinations, cryptographically random, unguessable. Import from `nanoid` package.
- **D-02:** Paste URLs follow the pattern `/{slug}` (e.g., `/a1b2c3d4`). No `/paste/` prefix — keep URLs short.

### Paste Creation Flow
- **D-03:** Single-page form on the home route (`/`). Textarea for content, submit button. On success, redirect to the paste URL.
- **D-04:** No title field, no language selector, no metadata inputs in v1. Just content and submit.

### Data Schema
- **D-05:** SQLite `pastes` table schema: `id` (TEXT PK, nanoid), `content` (TEXT, NOT NULL), `created_at` (INTEGER, Unix timestamp), `expires_at` (INTEGER, nullable Unix timestamp), `size_bytes` (INTEGER).
- **D-06:** Include `expires_at` column from day one even though expiration UI ships in Phase 3. Prevents painful schema migration later.
- **D-07:** Use WAL mode for SQLite to support concurrent reads.

### API Design
- **D-08:** POST `/api/paste` to create a paste. Accepts JSON body `{ content: string }`. Returns `{ id: string, url: string }`.
- **D-09:** GET `/api/paste/:id` to retrieve paste data. Returns JSON `{ id, content, created_at, expires_at }`.
- **D-10:** GET `/api/paste/:id/raw` to retrieve raw content as `text/plain`.

### Content Validation
- **D-11:** Reject empty content (0 bytes) with 400 Bad Request.
- **D-12:** Reject content exceeding 512KB with 413 Payload Too Large.
- **D-13:** Validate content size server-side. Client-side validation is a nice-to-have but not a security boundary.

### Error Handling
- **D-14:** 404 page for paste not found (clean, minimal).
- **D-15:** Inline validation errors on the create form (empty content, too large).
- **D-16:** API errors return JSON with `{ error: string }` and appropriate HTTP status codes.

### Claude's Discretion
- Next.js App Router file structure and organization
- Drizzle ORM configuration and migration approach
- SQLite file location (e.g., `data/paste.db`)
- Error page styling (minimal is fine for Phase 1)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full requirements with REQ-IDs (CORE-01..04, STOR-01, SECU-04 for this phase)

### Research
- `.planning/research/STACK.md` — Technology stack recommendations with versions (Next.js 16, Drizzle, better-sqlite3, nanoid)
- `.planning/research/ARCHITECTURE.md` — System architecture, component boundaries, data flow
- `.planning/research/PITFALLS.md` — Critical pitfalls (especially #3: unbounded storage, #5: predictable URLs)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code.

### Established Patterns
- None — patterns will be established in this phase.

### Integration Points
- None — this is the foundation phase.

</code_context>

<specifics>
## Specific Ideas

- Research recommends Next.js 16 with App Router, Drizzle ORM with better-sqlite3, and nanoid for IDs
- SQLite in WAL mode for concurrent reads
- Docker/VPS deployment target (SQLite needs persistent filesystem)
- The API endpoints created here will be reused by all subsequent phases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Foundation & Data Path*
*Context gathered: 2026-05-14*
