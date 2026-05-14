# Phase 1: Foundation & Data Path - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 1-Foundation & Data Path
**Areas discussed:** URL slug format, Paste creation flow, Data schema design, Error handling
**Mode:** --auto (all decisions auto-selected from recommended defaults)

---

## URL Slug Format

| Option | Description | Selected |
|--------|-------------|----------|
| nanoid 8-char alphanumeric | 281T combinations, URL-safe, unguessable, 118 bytes | ✓ |
| UUID v4 | Standard but long URLs, not user-friendly | |
| base62 sequential | Short but predictable and enumerable | |

**User's choice:** [auto] nanoid 8-char alphanumeric (recommended default)
**Notes:** Research strongly recommends nanoid. Pitfalls research flags sequential IDs as a security risk.

---

## Paste Creation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single-page form + redirect | Textarea, submit, redirect to paste URL | ✓ |
| Two-step with preview | Create, preview, then confirm | |
| API-first with minimal UI | curl-friendly API, basic HTML form on top | |

**User's choice:** [auto] Single-page form + redirect (recommended default)
**Notes:** Aligns with "zero friction" core value. Preview is handled in Phase 2 (live editor preview).

---

## Data Schema Design

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal with expiration | id, content, created_at, expires_at, size_bytes | ✓ |
| Extended with metadata | Add title, language, view_count, ip_hash | |
| Content-separated | Metadata table + content blob store | |

**User's choice:** [auto] Minimal with expiration (recommended default)
**Notes:** Research emphatic about including expires_at from day one. Pitfall #3 (unbounded storage) is the motivation.

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Inline + dedicated pages | Form errors inline, HTTP errors on dedicated pages | ✓ |
| Toast notifications | Ephemeral toast popups for all errors | |
| API-only errors | JSON error responses, client interprets | |

**User's choice:** [auto] Inline + dedicated pages (recommended default)
**Notes:** Standard web pattern. Covers 400, 404, 410, 413, 429 status codes.

---

## Claude's Discretion

- Next.js App Router file structure and organization
- Drizzle ORM configuration and migration approach
- SQLite file location
- Error page styling (minimal for Phase 1)

## Deferred Ideas

None — discussion stayed within phase scope.
