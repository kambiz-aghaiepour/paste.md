# Phase 3: Paste Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 3-Paste Lifecycle
**Areas discussed:** Expiration Selector, Expired Paste Experience, Raw/Rendered Toggle, Background Cleanup Strategy
**Mode:** --auto (all decisions made by Claude using recommended defaults)

---

## Expiration Selector

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown below textarea | Compact `<select>` with predefined options, default "Never" | ✓ |
| Radio buttons inline | Visible options but takes more vertical space | |
| Toolbar select | Select in a toolbar above editor, less discoverable | |

**Auto-selected:** Dropdown below textarea (recommended default — compact, matches minimal UI constraint)
**Notes:** Default "Never" preserves current behavior. Server calculates `expires_at` from a duration string.

---

## Expired Paste Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Styled 410 page | Matches app design, clear "This paste has expired" message | ✓ |
| Minimal text page | Plain text 410 response, no styling | |
| Redirect to home | Loses context, user doesn't know why they were redirected | |

**Auto-selected:** Styled 410 page matching app design (recommended default)
**Notes:** No details about when it expired or what it contained — the paste is gone.

---

## Raw/Rendered Toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Tab bar above content | "Rendered" / "Raw" tabs, mirrors edit/preview pattern from Phase 2 | ✓ |
| Toggle button in header | Single button, less discoverable | |
| URL-based (/slug/raw) | Separate route, requires server roundtrip | |

**Auto-selected:** Tab bar above content (recommended default — consistent with Phase 2 toggle pattern)
**Notes:** Client-side state only, no URL change. Raw view uses monospace `<pre>`, no line numbers.

---

## Background Cleanup Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| On-read check + API cleanup route | Soft expiration check in routes, `/api/cleanup` for batch deletion | ✓ |
| In-process scheduler | `setInterval` in instrumentation file, adds statefulness | |
| Lazy deletion only | Only delete when accessed, rows accumulate indefinitely | |

**Auto-selected:** On-read check + API cleanup route (recommended default — keeps app stateless)
**Notes:** Cleanup route protected by `CLEANUP_SECRET` env var. External cron recommended hourly.

---

## Claude's Discretion

- Tab bar styling and component structure for raw/rendered toggle
- Expiration dropdown styling and placement relative to submit button
- 410 page layout and styling (match not-found page pattern)
- Whether to show expiration period label on paste view page

## Deferred Ideas

None — discussion stayed within phase scope
