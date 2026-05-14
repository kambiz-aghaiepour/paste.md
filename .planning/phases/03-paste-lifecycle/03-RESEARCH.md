# Phase 3: Paste Lifecycle - Research

**Researched:** 2026-05-14
**Domain:** Paste expiration, HTTP status codes, client-side view toggling, background cleanup
**Confidence:** HIGH

## Summary

Phase 3 adds four capabilities to the existing paste.md application: (1) an expiration selector on the creation form, (2) 410 Gone handling for expired pastes, (3) a rendered/raw view toggle on paste pages, and (4) a background cleanup endpoint for removing expired data.

The codebase already has the `expiresAt` column and index in the `pastes` schema (Phase 1 D-06), so no migration is needed. The creation API (`POST /api/paste`) needs to accept an `expiration` field and compute `expiresAt`. The paste view page and API GET routes need expiration checks. A new `/api/cleanup` route needs to be created. The view toggle is a client-side concern requiring a new Client Component wrapper around the existing `MarkdownRenderer`.

The primary architectural challenge is returning HTTP 410 from the paste page. Next.js App Router does not natively support custom status codes from Server Component pages. The recommended approach is a two-tier strategy: the API route returns 410 directly (trivial), while the page uses Next.js 16's `proxy.ts` to intercept expired paste requests and return a 410 HTML response before the page renders. [VERIFIED: Next.js docs, GitHub discussions]

**Primary recommendation:** Use `proxy.ts` with a lightweight `getPasteById` check to return 410 for expired pastes at the HTTP level; use the API route's 410 for programmatic clients; add a Client Component wrapper for the rendered/raw toggle.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add a dropdown (`<select>`) below the textarea in the paste creation form. Options: "Never", "1 hour", "1 day", "1 week", "1 month".
- **D-02:** Default selection is "Never" -- matches current behavior where pastes don't expire. Least surprising for users.
- **D-03:** The selected expiration is sent to `POST /api/paste` as an `expiration` field (string value like `"1h"`, `"1d"`, `"1w"`, `"1m"`, `"never"`). The server calculates `expires_at` as a Unix timestamp from `created_at + duration`.
- **D-04:** On-read expiration check: both the paste view page (`app/[slug]/page.tsx`) and the API route (`app/api/paste/[id]/route.ts`) check `expires_at` before serving. If `Date.now()/1000 > expires_at`, treat as expired.
- **D-05:** Expired pastes return HTTP 410 Gone. The paste view page shows a styled error page matching the app's design with a clear message: "This paste has expired." No details about when it expired or what it contained.
- **D-06:** The `getPasteById` query continues to return the row -- expiration checking happens in the route/page layer, not the query layer. This keeps the data access layer simple and allows the cleanup job to handle actual deletion.
- **D-07:** Add a tab bar above the paste content on the paste view page with two tabs: "Rendered" (default) and "Raw". This mirrors the edit/preview toggle pattern established in Phase 2.
- **D-08:** Raw view displays paste content in a monospace `<pre>` block with no additional formatting, no line numbers. Clean and readable.
- **D-09:** The toggle is client-side state only -- no URL change, no server roundtrip. Both views use the same paste data already fetched by the Server Component, passed to a Client Component wrapper that handles the tab switch.
- **D-10:** Add a `deleteExpiredPastes()` function in `lib/db/queries.ts` that batch-deletes rows where `expires_at IS NOT NULL AND expires_at < current_timestamp`. Return the count of deleted rows.
- **D-11:** Expose cleanup via `DELETE /api/cleanup` route. Protected by a simple shared secret (environment variable `CLEANUP_SECRET`) compared via header `Authorization: Bearer <secret>`. Returns `{ deleted: number }`.
- **D-12:** Cleanup is triggered by an external cron (e.g., system cron, Railway cron, Docker healthcheck). No in-process scheduler -- keeps the app stateless and simple. Recommended frequency: every hour.

### Claude's Discretion
- Tab bar styling and exact component structure for raw/rendered toggle
- Expiration dropdown styling and placement relative to the submit button
- 410 page layout and styling (keep it minimal, matching not-found page pattern)
- Whether to add the expiration period label on the paste view page (e.g., "Expires in 6 days")

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STOR-02 | User can select paste expiration when creating (1 hour, 1 day, 1 week, 1 month, never) | D-01/D-02/D-03: Dropdown with duration mapping, server-side `expiresAt` calculation. Column already exists. |
| STOR-03 | Expired pastes return 410 Gone status | D-04/D-05: Proxy-based 410 for page, direct 410 in API route. See Architecture section for approach. |
| STOR-04 | Background cleanup removes expired paste data | D-10/D-11/D-12: `deleteExpiredPastes()` query + `DELETE /api/cleanup` route with bearer secret. |
| REND-04 | User can toggle between rendered view and raw Markdown source on a paste page | D-07/D-08/D-09: Client Component wrapper with tab state, reusing existing `MarkdownRenderer`. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Next.js 16.x with App Router and Server Components
- React 19.2+, TypeScript 5.x
- Drizzle ORM 0.45.2 with better-sqlite3 12.10.0 (synchronous API: `.get()`, `.run()`, `.all()`)
- Tailwind CSS 4.3.x with `@tailwindcss/typography` (CSS-first config, `@plugin` directive)
- Biome for linting/formatting
- `@/` path alias for imports
- Server Components for data-fetching pages, Client Components with `"use client"` for interactive elements
- No authentication, no tRPC, no GraphQL -- simple REST endpoints

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Expiration selector UI | Browser / Client | -- | Interactive dropdown is client-side state in `PasteForm` Client Component |
| Expiration calculation (`expiresAt`) | API / Backend | -- | Server computes Unix timestamp from duration string; never trust client-computed timestamps |
| 410 status for expired paste pages | Frontend Server (Proxy) | API / Backend | `proxy.ts` intercepts page requests for correct HTTP status; API route also returns 410 for programmatic access |
| Expiration check logic | API / Backend | -- | `Date.now()/1000 > expiresAt` check in route/page handlers |
| Raw/rendered toggle | Browser / Client | -- | Client-side tab state, no server roundtrip; both views use same server-fetched data |
| Expired paste cleanup | API / Backend | Database / Storage | `DELETE /api/cleanup` route triggers Drizzle batch delete on SQLite |
| Cleanup scheduling | External (cron) | -- | Out-of-process scheduler keeps app stateless per D-12 |

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | Framework, proxy.ts for 410 | Already installed. proxy.ts replaces middleware.ts in v16 [VERIFIED: installed version] |
| Drizzle ORM | 0.45.2 | Delete query with `and`, `lt`, `isNotNull` operators | Already installed. Synchronous `.run()` returns `{ changes }` for delete count [VERIFIED: Context7 docs] |
| better-sqlite3 | 12.10.0 | SQLite driver | Already installed. `.run()` returns `RunResult` with `changes` property [VERIFIED: npm registry] |

### No New Dependencies
This phase requires zero new npm packages. All functionality is built with existing dependencies.

## Architecture Patterns

### System Architecture Diagram

```
User creates paste:
  Browser [PasteForm + expiration dropdown]
    |
    v (POST /api/paste { content, expiration })
  API Route [validate expiration string, compute expiresAt]
    |
    v
  SQLite [INSERT with expiresAt value]
    |
    v (201 { id, url })
  Browser [redirect to /{slug}]

User views paste:
  Browser [GET /{slug}]
    |
    v
  proxy.ts [getPasteById(slug) -> check expiresAt]
    |
    +--> expired? -> Return 410 HTML response (terminal)
    |
    +--> not expired / not found / no paste -> NextResponse.next()
           |
           v
         app/[slug]/page.tsx [Server Component]
           |
           +--> not found? -> notFound()
           |
           +--> found -> render PasteView [Client Component wrapper]
                           |
                           +--> "Rendered" tab: MarkdownRenderer
                           +--> "Raw" tab: <pre> block

Cleanup:
  External Cron [hourly]
    |
    v (DELETE /api/cleanup, Authorization: Bearer <secret>)
  API Route [verify secret]
    |
    v
  deleteExpiredPastes() [DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at < now]
    |
    v ({ deleted: N })
```

### Recommended File Changes

```
app/
  proxy.ts                          # NEW: 410 interception for expired pastes
  [slug]/
    page.tsx                        # MODIFY: add expiration check, pass data to client wrapper
    components/
      paste-view.tsx                # NEW: Client Component with rendered/raw toggle
  api/
    paste/
      route.ts                     # MODIFY: accept expiration field in POST
      [id]/
        route.ts                   # MODIFY: add expiration check, return 410
        raw/
          route.ts                 # MODIFY: add expiration check, return 410
    cleanup/
      route.ts                     # NEW: DELETE handler for expired paste cleanup
  components/
    paste-form.tsx                  # MODIFY: add expiration dropdown
lib/
  db/
    queries.ts                     # MODIFY: add deleteExpiredPastes()
  expiration.ts                    # NEW: duration-to-seconds mapping utility
```

### Pattern 1: Expiration Duration Mapping (Utility)

**What:** A pure function that maps expiration string values to seconds.
**When to use:** In the POST /api/paste route to compute `expiresAt` from `createdAt + duration`.

```typescript
// Source: Project decision D-03
// lib/expiration.ts

const EXPIRATION_SECONDS: Record<string, number | null> = {
  "1h": 3600,
  "1d": 86400,
  "1w": 604800,
  "1m": 2592000, // 30 days
  "never": null,
};

export const VALID_EXPIRATIONS = Object.keys(EXPIRATION_SECONDS);

export function computeExpiresAt(
  createdAt: number,
  expiration: string,
): number | null {
  const seconds = EXPIRATION_SECONDS[expiration];
  if (seconds === undefined) return null; // invalid -> treat as never
  if (seconds === null) return null; // "never"
  return createdAt + seconds;
}
```

### Pattern 2: 410 Gone via proxy.ts

**What:** Next.js 16 `proxy.ts` intercepts requests to `/{slug}` routes, checks paste expiration, and returns a 410 HTML response if expired.
**When to use:** This is the only way to return a true HTTP 410 from a page-level route in Next.js App Router. [VERIFIED: Next.js docs, GitHub discussions]

```typescript
// Source: Next.js 16 proxy.ts docs (https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
// app/proxy.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";

// Match paste slug routes (8-char nanoid pattern)
export const config = {
  matcher: "/:slug([A-Za-z0-9_-]{8})",
};

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice(1); // Remove leading /
  const paste = getPasteById(slug);

  if (paste?.expiresAt && Date.now() / 1000 > paste.expiresAt) {
    // Return 410 with minimal styled HTML
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expired - paste.md</title></head>
<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased">
  <h1 style="margin-bottom:1rem;font-size:2.25rem;font-weight:700;color:#9ca3af">410</h1>
  <p style="margin-bottom:2rem;color:#6b7280">This paste has expired.</p>
  <a href="/" style="color:#2563eb;text-decoration:none">Back to home</a>
</body>
</html>`,
      {
        status: 410,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  return NextResponse.next();
}
```

**Key insight:** The proxy runs before the page renders. If the paste is expired, the proxy returns the 410 response immediately and the page Server Component never executes. This eliminates the double-fetch problem (proxy + page both querying the database) for expired pastes. For non-expired pastes, the proxy's `getPasteById` call is a fast SQLite read (sub-millisecond), and the page will call it again -- two reads of the same row is acceptable overhead for correct HTTP semantics.

### Pattern 3: Delete with Row Count (Drizzle + better-sqlite3)

**What:** Batch-delete expired rows and return the count of deleted rows.
**When to use:** In the `deleteExpiredPastes()` function.

```typescript
// Source: Drizzle ORM docs (https://orm.drizzle.team/docs/delete)
// Source: better-sqlite3 docs (https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
// lib/db/queries.ts

import { and, lt, isNotNull } from "drizzle-orm";

export function deleteExpiredPastes(): number {
  const now = Math.floor(Date.now() / 1000);
  const result = db
    .delete(pastes)
    .where(and(isNotNull(pastes.expiresAt), lt(pastes.expiresAt, now)))
    .run();
  return result.changes;
}
```

**Why `.run()` instead of `.returning()`:** The `.run()` method returns `{ changes: number }` from better-sqlite3's `RunResult`, which gives the count of deleted rows without transferring all deleted row data back. For bulk cleanup operations, this is the correct pattern. [VERIFIED: better-sqlite3 docs, Drizzle ORM docs]

### Pattern 4: Client Component View Toggle

**What:** A Client Component that wraps the paste content and provides a tab bar to switch between rendered and raw views.
**When to use:** On the paste view page (`app/[slug]/page.tsx`).

```typescript
// app/[slug]/components/paste-view.tsx
"use client";

import { useState } from "react";

interface PasteViewProps {
  content: string;
  renderedContent: React.ReactNode; // Pre-rendered by Server Component
}

export function PasteView({ content, renderedContent }: PasteViewProps) {
  const [activeTab, setActiveTab] = useState<"rendered" | "raw">("rendered");

  return (
    <div>
      {/* Tab bar - mirrors Phase 2 edit/preview toggle pattern */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("rendered")}
          aria-pressed={activeTab === "rendered"}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            activeTab === "rendered"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Rendered
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("raw")}
          aria-pressed={activeTab === "raw"}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            activeTab === "raw"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Raw
        </button>
      </div>

      {/* Content */}
      {activeTab === "rendered" ? (
        renderedContent
      ) : (
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
          {content}
        </pre>
      )}
    </div>
  );
}
```

**Key insight:** The `renderedContent` prop receives the already-rendered `<MarkdownRenderer>` output from the Server Component. The raw content is the plain string. Both are passed down once; the toggle is purely client-side state. This avoids any re-rendering of the markdown pipeline on tab switch. [ASSUMED: React Server Component children can be passed as props to Client Components -- this is a standard RSC pattern]

### Pattern 5: Cleanup Route with Bearer Auth

**What:** A DELETE endpoint protected by a shared secret for automated cleanup.
**When to use:** External cron hits this endpoint periodically.

```typescript
// Source: Next.js 16 Route Handler docs
// app/api/cleanup/route.ts

import { NextResponse } from "next/server";
import { deleteExpiredPastes } from "@/lib/db/queries";

export async function DELETE(request: Request) {
  const secret = process.env.CLEANUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cleanup not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = deleteExpiredPastes();
  return NextResponse.json({ deleted });
}
```

### Anti-Patterns to Avoid
- **Computing `expiresAt` on the client:** Never trust client-sent timestamps. The server must compute `expiresAt` from the duration string. [D-03]
- **Checking expiration in the database query layer:** Per D-06, keep `getPasteById` simple; expiration logic belongs in the route/page layer.
- **Using `notFound()` for expired pastes:** `notFound()` returns 404, not 410. These are semantically different -- 404 means "never existed", 410 means "existed but is gone". Search engines treat them differently.
- **In-process cleanup schedulers (setInterval, node-cron):** These make the app stateful and create issues with multiple instances, serverless environments, and container restarts. External cron per D-12.
- **Using `loading.tsx` in the `[slug]` route:** A `loading.tsx` file would stream a skeleton immediately, locking the HTTP status to 200 before the proxy can intervene. Do not add `loading.tsx` to the slug route segment. [VERIFIED: Next.js streaming docs]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Expiration time calculation | Manual date arithmetic | Simple lookup table (seconds mapping) | Avoid off-by-one, timezone bugs; duration-to-seconds is a constant map |
| Authorization header parsing | Custom string splitting | Direct string comparison `header === \`Bearer ${secret}\`` | The auth model is a single shared secret, not JWT/OAuth -- keep it simple |
| Cleanup scheduling | In-process `setInterval` or `node-cron` | External cron (system, Docker, Railway) | Stateless app per D-12; in-process schedulers break with multiple instances |
| Tab component | Third-party tabs library | Two-button div with state | Only two tabs, no complex behavior -- a library adds bundle weight for nothing |

**Key insight:** This phase is intentionally simple. Every feature maps to a small, well-understood pattern. Resist the urge to over-engineer.

## Common Pitfalls

### Pitfall 1: Proxy matcher too broad
**What goes wrong:** The proxy intercepts every request (including static assets, API routes, the home page), causing unnecessary database queries on every request.
**Why it happens:** Not constraining the `config.matcher` pattern.
**How to avoid:** Use a precise matcher that only matches 8-character nanoid slug patterns: `/:slug([A-Za-z0-9_-]{8})`. This avoids matching `/api/*`, `/favicon.ico`, `/_next/*`, etc.
**Warning signs:** Every page load triggers a database query in the proxy.

### Pitfall 2: Timing comparison using Date objects instead of Unix timestamps
**What goes wrong:** Comparing `new Date()` with a Unix timestamp stored as an integer causes incorrect expiration checks.
**Why it happens:** JavaScript `Date.now()` returns milliseconds, but `expiresAt` is stored as Unix seconds (per Phase 1 schema).
**How to avoid:** Always use `Math.floor(Date.now() / 1000)` for comparison with `expiresAt`. The existing codebase uses this pattern consistently. [VERIFIED: codebase inspection of `app/api/paste/route.ts` line 33]
**Warning signs:** Pastes expiring immediately or never expiring.

### Pitfall 3: Missing expiration validation on POST
**What goes wrong:** The API accepts arbitrary strings for the `expiration` field, potentially storing invalid data.
**Why it happens:** Trusting client input without validation.
**How to avoid:** Validate `expiration` against the allowed values (`"1h"`, `"1d"`, `"1w"`, `"1m"`, `"never"`). Reject unknown values with 400 Bad Request. If `expiration` is omitted, default to `"never"` (null `expiresAt`).
**Warning signs:** Non-null `expiresAt` values that don't correspond to valid durations.

### Pitfall 4: Cleanup secret exposed in responses
**What goes wrong:** Error messages leak whether the cleanup endpoint exists or what secret format is expected.
**Why it happens:** Over-detailed error responses.
**How to avoid:** Return generic `401 Unauthorized` for any auth failure. Don't distinguish between "missing header" and "wrong secret".
**Warning signs:** Penetration testing reveals endpoint enumeration.

### Pitfall 5: Proxy database access in Edge Runtime
**What goes wrong:** `better-sqlite3` is a native Node.js module that cannot run in Edge Runtime.
**Why it happens:** Next.js 16's `proxy.ts` runs on Node.js runtime by default, but if accidentally configured for edge, native modules fail.
**How to avoid:** Do NOT add `export const runtime = 'edge'` to proxy.ts. Next.js 16 proxy defaults to Node.js runtime. [VERIFIED: Next.js 16 docs]
**Warning signs:** Build errors about native modules, `better-sqlite3` not found.

### Pitfall 6: Forgetting to check expiration in the /raw route
**What goes wrong:** The raw API endpoint (`/api/paste/[id]/raw`) serves content for expired pastes even after adding expiration checks to the JSON endpoint and page.
**Why it happens:** Three separate routes serve paste content; easy to miss one.
**How to avoid:** Add the same expiration check pattern to all three routes: page, JSON API, and raw API. Consider extracting a shared `isPasteExpired` helper.
**Warning signs:** Expired paste content accessible via `/api/paste/{id}/raw`.

## Code Examples

### Expiration Dropdown in PasteForm

```typescript
// Source: Decision D-01/D-02, existing paste-form.tsx pattern
// Addition to app/components/paste-form.tsx

const [expiration, setExpiration] = useState("never");

// In the JSX, below the textarea, above the submit button:
<select
  value={expiration}
  onChange={(e) => setExpiration(e.target.value)}
  aria-label="Paste expiration"
  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
>
  <option value="never">Never expires</option>
  <option value="1h">1 hour</option>
  <option value="1d">1 day</option>
  <option value="1w">1 week</option>
  <option value="1m">1 month</option>
</select>
```

### Modified POST Handler

```typescript
// Source: Decision D-03, existing app/api/paste/route.ts
// Changes to the POST handler:

import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";

// Inside POST handler, after content validation:
const { content, expiration } = body as { content?: string; expiration?: string };

const expirationValue = expiration ?? "never";
if (!VALID_EXPIRATIONS.includes(expirationValue)) {
  return NextResponse.json(
    { error: "Invalid expiration value" },
    { status: 400 },
  );
}

const expiresAt = computeExpiresAt(now, expirationValue);

createPaste({
  id,
  content,
  createdAt: now,
  expiresAt,
  sizeBytes,
});
```

### Expiration Check in API GET Route

```typescript
// Source: Decision D-04, existing app/api/paste/[id]/route.ts

const paste = getPasteById(id);
if (!paste) {
  return NextResponse.json({ error: "Paste not found" }, { status: 404 });
}

if (paste.expiresAt && Date.now() / 1000 > paste.expiresAt) {
  return NextResponse.json({ error: "This paste has expired" }, { status: 410 });
}
```

### Server Component Page with Client Wrapper

```typescript
// Source: Decisions D-07/D-09, existing app/[slug]/page.tsx pattern
// The Server Component fetches data and passes to Client Component

import { notFound } from "next/navigation";
import { getPasteById } from "@/lib/db/queries";
import { MarkdownRenderer } from "@/app/components/markdown-renderer";
import { PasteView } from "./components/paste-view";

export default async function PastePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const paste = getPasteById(slug);
  if (!paste) {
    notFound();
  }

  // Note: expiration is checked in proxy.ts for 410 status.
  // If we reach here, the paste is valid (not expired or no expiration set).

  return (
    <main className="mx-auto max-w-3xl p-8">
      <PasteView
        content={paste.content}
        renderedContent={<MarkdownRenderer content={paste.content} />}
      />
      <p className="mt-4 text-sm text-gray-500">
        Created: {new Date(paste.createdAt * 1000).toISOString()}
      </p>
    </main>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 (2025) | File renamed, function renamed from `middleware` to `proxy`. Node.js runtime only (no edge). [VERIFIED: Next.js 16 docs] |
| No native 410 support | Still no native 410 support | -- | PR #78706 for `gone()` function still unmerged. Proxy approach is the recommended workaround. [VERIFIED: GitHub discussion #86345] |
| Drizzle `delete().execute()` | Drizzle `delete().run()` | Drizzle 0.29+ | Synchronous `.run()` returns `{ changes }` for better-sqlite3 driver. [VERIFIED: Drizzle docs] |

**Deprecated/outdated:**
- `middleware.ts` is deprecated in Next.js 16 in favor of `proxy.ts`. Still works but will be removed in a future version. [VERIFIED: Next.js upgrade guide]

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React Server Component children can be passed as props to Client Components (standard RSC pattern) | Pattern 4: Client Component View Toggle | If wrong, the toggle component architecture needs restructuring. Risk is LOW -- this is a well-documented RSC pattern. |

## Open Questions

1. **Proxy matcher regex validation**
   - What we know: nanoid(8) produces `[A-Za-z0-9_-]{8}` strings. The matcher `/:slug([A-Za-z0-9_-]{8})` should work.
   - What's unclear: Whether Next.js 16 proxy matcher supports regex groups in this exact syntax. The docs show glob patterns like `/:path*` but regex groups need testing.
   - Recommendation: Test the matcher in development. Fallback: match all single-segment paths and check slug format in the proxy function body.

2. **Proxy double-read overhead**
   - What we know: For non-expired pastes, `proxy.ts` reads the paste from SQLite, then `page.tsx` reads it again. SQLite reads are sub-millisecond.
   - What's unclear: Whether this is noticeable under load.
   - Recommendation: Accept the double-read. Sub-millisecond SQLite reads on the same row (likely cached by OS page cache) make this negligible. Optimization (e.g., passing data via headers) is not worth the complexity.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STOR-02 | POST /api/paste accepts expiration field, stores correct expiresAt | unit | `npx vitest run tests/api/paste.test.ts -t "STOR-02"` | Existing file, new tests needed |
| STOR-02 | computeExpiresAt returns correct timestamps | unit | `npx vitest run tests/lib/expiration.test.ts -t "STOR-02"` | New file needed |
| STOR-02 | POST /api/paste rejects invalid expiration values | unit | `npx vitest run tests/api/paste.test.ts -t "STOR-02"` | Existing file, new tests needed |
| STOR-03 | GET /api/paste/:id returns 410 for expired paste | unit | `npx vitest run tests/api/paste.test.ts -t "STOR-03"` | Existing file, new tests needed |
| STOR-03 | GET /api/paste/:id/raw returns 410 for expired paste | unit | `npx vitest run tests/api/paste.test.ts -t "STOR-03"` | Existing file, new tests needed |
| STOR-04 | deleteExpiredPastes removes only expired rows, returns count | unit | `npx vitest run tests/lib/db.test.ts -t "STOR-04"` | Existing file, new tests needed |
| STOR-04 | DELETE /api/cleanup returns 401 without valid secret | unit | `npx vitest run tests/api/cleanup.test.ts -t "STOR-04"` | New file needed |
| STOR-04 | DELETE /api/cleanup deletes expired pastes with valid secret | unit | `npx vitest run tests/api/cleanup.test.ts -t "STOR-04"` | New file needed |
| REND-04 | Raw/rendered toggle (manual) | manual-only | -- | N/A (client-side state in Client Component; testing RSC+client interaction requires browser) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/expiration.test.ts` -- covers STOR-02 duration mapping
- [ ] `tests/api/cleanup.test.ts` -- covers STOR-04 cleanup endpoint
- Tests for STOR-02 (POST with expiration), STOR-03 (410 on expired), STOR-04 (deleteExpiredPastes) can be added to existing test files

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Minimal | Bearer token for cleanup endpoint only (shared secret, not user auth) |
| V3 Session Management | No | No sessions in the application |
| V4 Access Control | Minimal | Cleanup endpoint protected by bearer secret |
| V5 Input Validation | Yes | Validate `expiration` field against allowlist; existing content validation unchanged |
| V6 Cryptography | No | No cryptographic operations in this phase |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cleanup secret brute-force | Tampering | Use long random secret (32+ chars); rate-limit cleanup endpoint in production (Phase 4) |
| Expired paste data leakage via raw endpoint | Information Disclosure | Add expiration check to ALL three routes (page, JSON API, raw API) |
| Timing attack on bearer comparison | Information Disclosure | Use constant-time comparison (`crypto.timingSafeEqual`) for cleanup secret. For MVP, direct string comparison is acceptable given the threat model (internal cron, not public-facing auth). |
| Client-side expiration bypass | Tampering | Server computes `expiresAt`; client only sends duration string. No client-computed timestamps. |

## Sources

### Primary (HIGH confidence)
- [Context7: /vercel/next.js] - proxy.ts file convention, producing a response, NextResponse.rewrite API, streaming status codes
- [Context7: /llmstxt/orm_drizzle_team_llms_txt] - delete with where clause, lt/and/isNotNull operators, returning clause, run() method
- [Next.js 16 proxy.ts docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) - proxy file convention, matcher, producing responses
- [Next.js NextResponse docs](https://nextjs.org/docs/app/api-reference/functions/next-response) - rewrite, json, redirect methods
- [Drizzle ORM delete docs](https://orm.drizzle.team/docs/delete) - delete with returning, run
- [Drizzle ORM operators docs](https://orm.drizzle.team/docs/operators) - lt, and, isNotNull
- [better-sqlite3 API docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) - RunResult.changes

### Secondary (MEDIUM confidence)
- [GitHub Discussion #86345](https://github.com/vercel/next.js/discussions/86345) - Recommended way to return 410 from page.tsx in Next.js 16
- [DEV Community: HTTP 410 in Next.js App Router](https://dev.to/alessandro-grosselle/how-to-return-http-410-gone-status-in-nextjs-app-router-two-workarounds-2f0g) - Middleware/proxy workaround approaches
- [Next.js upgrading guide v16](https://nextjs.org/docs/app/guides/upgrading/version-16) - middleware to proxy rename

### Tertiary (LOW confidence)
None -- all claims verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all libraries already installed and verified
- Architecture: HIGH - All patterns verified against Next.js 16 docs and Drizzle ORM docs; 410 approach confirmed via official discussions
- Pitfalls: HIGH - Based on verified codebase inspection and documented Next.js limitations
- Validation: HIGH - Existing test infrastructure (Vitest) with established patterns in codebase

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable -- no fast-moving dependencies)
