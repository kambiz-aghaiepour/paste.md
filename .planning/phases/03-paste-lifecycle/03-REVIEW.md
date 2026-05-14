---
phase: 03-paste-lifecycle
reviewed: 2026-05-14T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - app/[slug]/components/paste-view.tsx
  - app/[slug]/page.tsx
  - app/api/cleanup/route.ts
  - app/api/paste/[id]/raw/route.ts
  - app/api/paste/[id]/route.ts
  - app/api/paste/route.ts
  - app/components/paste-form.tsx
  - app/proxy.ts
  - lib/db/queries.ts
  - lib/expiration.ts
  - tests/api/cleanup.test.ts
  - tests/api/paste.test.ts
  - tests/lib/db.test.ts
  - tests/lib/expiration.test.ts
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

This review examined the paste lifecycle implementation including creation, retrieval, expiration handling, and cleanup. The implementation demonstrates good understanding of Next.js 16 patterns and SQLite usage, but contains several critical bugs that would cause runtime failures in production.

Three critical issues were identified that cause incorrect behavior or data inconsistency. Four warnings flag missing error handling and edge case validation. Two informational findings suggest quality improvements.

## Critical Issues

### CR-01: Unused expiresAt Prop Indicates Dead Code Path

**File:** `app/[slug]/components/paste-view.tsx:8-11`
**Issue:** The `PasteView` component accepts an `expiresAt` prop in the interface but never uses it. This suggests either:
1. A planned feature that was never implemented (bug by omission)
2. Dead code that should be removed
3. Expiration display logic that exists in the parent but not where it belongs

The parent component (`app/[slug]/page.tsx`) displays expiration time, but this violates separation of concerns — the display logic should be in the view component, not the page.

**Fix:**
```tsx
// Either remove the unused prop from the interface:
interface PasteViewProps {
  content: string;
  renderedContent: React.ReactNode;
  // Remove: expiresAt: number | null;
}

// OR implement the missing functionality in PasteView:
export function PasteView({ content, renderedContent, expiresAt }: PasteViewProps) {
  // ... existing tab logic
  
  return (
    <div>
      {/* existing tab UI */}
      
      {expiresAt !== null && expiresAt > Date.now() / 1000 && (
        <p className="mt-2 text-sm text-gray-500">
          Expires in {formatRelativeTime(expiresAt - Date.now() / 1000)}
        </p>
      )}
    </div>
  );
}
```

### CR-02: Race Condition in nanoid Collision Recovery

**File:** `app/api/paste/route.ts:56-73`
**Issue:** The collision recovery logic retries with a new ID but does not catch the second `createPaste` call. If the retry also fails (e.g., another collision, database lock, disk full), the error propagates uncaught and the API returns a 500 error with no error handling.

The current logic:
```typescript
try {
  createPaste({ id, ... });
} catch (err) {
  if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
    createPaste({ id: retryId, ... }); // UNCAUGHT - could fail again
    return NextResponse.json(...);
  }
  throw err; // Other errors re-thrown
}
```

If `createPaste` with `retryId` throws, execution never reaches the `return` statement and the error bubbles up unhandled.

**Fix:**
```typescript
try {
  createPaste({
    id,
    content,
    createdAt: now,
    expiresAt,
    sizeBytes,
  });
} catch (err: unknown) {
  // Handle extremely unlikely nanoid collision
  if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
    const retryId = nanoid(8);
    try {
      createPaste({
        id: retryId,
        content,
        createdAt: now,
        expiresAt,
        sizeBytes,
      });
      return NextResponse.json(
        { id: retryId, url: `/${retryId}` },
        { status: 201 },
      );
    } catch (retryErr) {
      // Second collision or other database error
      return NextResponse.json(
        { error: "Failed to create paste. Please try again." },
        { status: 500 },
      );
    }
  }
  // Other errors (database locked, disk full, etc.)
  return NextResponse.json(
    { error: "Database error" },
    { status: 500 },
  );
}
```

### CR-03: Expired Paste Still Renders (Time-of-Check vs Time-of-Use)

**File:** `app/[slug]/page.tsx:26-33`
**Issue:** The paste expiration check happens in a `formatRelativeTime` calculation but the paste is retrieved and rendered regardless of expiration status. An expired paste will display with no expiration warning to the user.

The current logic:
```typescript
const paste = getPasteById(slug);
if (!paste) {
  notFound();
}

const now = Math.floor(Date.now() / 1000);
const remaining = paste.expiresAt ? paste.expiresAt - now : null;

return (
  // ... renders content regardless of expiration status
);
```

The check at line 44 `{remaining !== null && remaining > 0 && ...}` only controls **displaying** the expiration message, not whether the content is shown. An expired paste (remaining < 0) renders fully without any indication it's expired.

**Fix:**
```typescript
const paste = getPasteById(slug);
if (!paste) {
  notFound();
}

const now = Math.floor(Date.now() / 1000);

// Check expiration BEFORE rendering
if (paste.expiresAt && paste.expiresAt <= now) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-400 mb-4">410</h1>
        <p className="text-gray-600">This paste has expired.</p>
      </div>
    </main>
  );
}

const remaining = paste.expiresAt ? paste.expiresAt - now : null;

return (
  <main className="mx-auto max-w-3xl p-8">
    <PasteView
      content={paste.content}
      renderedContent={<MarkdownRenderer content={paste.content} />}
      expiresAt={paste.expiresAt}
    />
    {/* ... rest of render */}
  </main>
);
```

## Warnings

### WR-01: Missing Error Handling for JSON Parsing in Tests

**File:** `tests/api/paste.test.ts:55-56`
**Issue:** Multiple test cases call `await response.json()` without checking if the response is JSON-parseable. If the API returns a 500 error with HTML or plain text, these tests will throw uncaught errors instead of failing gracefully with clear error messages.

**Fix:**
```typescript
if (!res.ok) {
  let errorMessage = "Failed to create paste";
  try {
    const data = await res.json();
    errorMessage = data.error || errorMessage;
  } catch {
    // Response was not JSON, use default message
  }
  setError(errorMessage);
  return;
}
```

### WR-02: Inconsistent Expiration Validation Between Proxy and API Routes

**File:** `app/proxy.ts:13` and `app/api/paste/[id]/route.ts:15`
**Issue:** The proxy uses `Date.now() / 1000 > paste.expiresAt` (strict greater-than) while the API routes use the same comparison. However, the API routes check `paste.expiresAt && ...` while proxy does not null-check first, relying on JavaScript's type coercion. If `paste.expiresAt` is `null`, the comparison `null > anything` is always `false`, which is correct behavior but not explicit.

More critically, the comparison should be `>=` not `>` — a paste that expires at timestamp `1000` should be expired at timestamp `1000`, not at `1001`.

**Fix:**
```typescript
// In proxy.ts:13 and both API routes
if (paste.expiresAt && Date.now() / 1000 >= paste.expiresAt) {
  // Return expired response
}
```

### WR-03: Empty Catch Blocks Swallow Errors in Client Code

**File:** `app/components/paste-form.tsx:63`
**Issue:** The catch block catches network errors but provides a generic message. If the JSON parsing fails or other unexpected errors occur in the try block (e.g., router.push fails), they're silently swallowed and reported as "Network error."

The current code:
```typescript
try {
  const res = await fetch("/api/paste", { ... });
  if (!res.ok) {
    const data = await res.json(); // Could throw if response is not JSON
    setError(data.error || "Failed to create paste");
    return;
  }
  const data = await res.json(); // Could throw if response is not JSON
  router.push(data.url);
  clearDraft();
} catch {
  setError("Network error. Please try again.");
}
```

**Fix:**
```typescript
try {
  const res = await fetch("/api/paste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, expiration }),
  });

  if (!res.ok) {
    let errorMessage = "Failed to create paste";
    try {
      const data = await res.json();
      errorMessage = data.error || errorMessage;
    } catch {
      // Response was not JSON, use status text
      errorMessage = res.statusText || errorMessage;
    }
    setError(errorMessage);
    return;
  }

  const data = await res.json();
  router.push(data.url);
  clearDraft();
} catch (err) {
  console.error("Paste creation failed:", err);
  setError("Network error. Please try again.");
}
```

### WR-04: Database Client is Singleton but Not Protected Against Concurrent Access

**File:** `lib/db/index.ts:15-16`
**Issue:** The `better-sqlite3` database connection is created as a module-level singleton. While SQLite itself is thread-safe with WAL mode and `busy_timeout`, the Node.js `better-sqlite3` library is **synchronous** and blocking. In Next.js 16 Server Components, multiple concurrent requests can call database queries, which will block the event loop.

This is not a bug per se (SQLite will queue operations correctly), but it's a performance degradation. For a pastebin with low traffic this is acceptable, but should be documented.

Additionally, the database is never closed. In long-running processes this is fine, but in serverless environments (Vercel, AWS Lambda) the connection should be managed per-request or with connection pooling.

**Fix:**
Add a comment documenting the design decision:
```typescript
// Module-level singleton connection. better-sqlite3 is synchronous and will
// block the event loop during queries. This is acceptable for a low-traffic
// pastebin (SQLite handles 100k+ writes/sec on modern hardware). For high
// concurrency, consider switching to PostgreSQL with connection pooling.
//
// WAL mode + busy_timeout ensures concurrent reads don't block each other.
// Writes will serialize automatically.
const sqlite = new Database(DB_PATH);
```

## Info

### IN-01: Magic Numbers in Expiration Calculation

**File:** `lib/expiration.ts:1-7`
**Issue:** The expiration duration constants (3600, 86400, etc.) are magic numbers. While the keys make them obvious ("1h" = 3600 seconds), using named constants improves maintainability.

**Fix:**
```typescript
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_WEEK = 604800;
const SECONDS_PER_MONTH = 2592000; // 30 days

const EXPIRATION_SECONDS: Record<string, number | null> = {
  "1h": SECONDS_PER_HOUR,
  "1d": SECONDS_PER_DAY,
  "1w": SECONDS_PER_WEEK,
  "1m": SECONDS_PER_MONTH,
  "never": null,
};
```

### IN-02: Proxy Function is Defined but Not Exported as Middleware

**File:** `app/proxy.ts:9-32`
**Issue:** The `proxy` function and `config` object are defined but there is no `middleware.ts` file in the project root that exports this function. This means the proxy logic is **never called** — it's dead code.

The intended usage appears to be Next.js middleware that intercepts paste view requests to check expiration before the page renders. However, without a `middleware.ts` file exporting this function, it has no effect.

**Fix:**
Create `middleware.ts` in the project root:
```typescript
export { proxy as middleware, config } from "./app/proxy";
```

OR, if the proxy is not needed (because the page component checks expiration), remove `app/proxy.ts` entirely.

---

_Reviewed: 2026-05-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
