# Phase 3: Paste Lifecycle - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 12 (new and modified)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/expiration.ts` | utility | transform | `lib/db/schema.ts` | partial (both are small typed exports) |
| `app/api/paste/route.ts` | controller | request-response | itself (modify) | exact |
| `app/api/paste/[id]/route.ts` | controller | request-response | itself (modify) | exact |
| `app/api/paste/[id]/raw/route.ts` | controller | request-response | itself (modify) | exact |
| `app/api/cleanup/route.ts` | controller | request-response | `app/api/paste/[id]/route.ts` | role-match |
| `app/proxy.ts` | middleware | request-response | `app/not-found.tsx` (styling) + `app/api/paste/[id]/route.ts` (logic) | partial |
| `app/[slug]/page.tsx` | component | request-response | itself (modify) | exact |
| `app/[slug]/components/paste-view.tsx` | component | event-driven | `app/components/paste-form.tsx` (tab toggle) | role-match |
| `app/components/paste-form.tsx` | component | event-driven | itself (modify) | exact |
| `lib/db/queries.ts` | service | CRUD | itself (modify) | exact |
| `tests/lib/expiration.test.ts` | test | transform | `tests/lib/db.test.ts` | role-match |
| `tests/api/cleanup.test.ts` | test | request-response | `tests/api/paste.test.ts` | exact |

## Pattern Assignments

### `lib/expiration.ts` (utility, transform) -- NEW

**Analog:** `lib/db/schema.ts`

**Imports pattern** (lines 1-1):
```typescript
// No framework imports needed -- pure utility module
// Follow the pattern of typed const exports from schema.ts
```

**Core pattern** -- typed export with const record (schema.ts lines 3-15):
```typescript
// schema.ts exports typed constants + type aliases
// expiration.ts should follow same pattern: named exports, no default export
export const pastes = sqliteTable(/* ... */);
export type Paste = typeof pastes.$inferSelect;
export type NewPaste = typeof pastes.$inferInsert;
```

**Concrete guidance:** Export `VALID_EXPIRATIONS` as a typed array and `computeExpiresAt` as a named function. No default exports. No classes. Pure functions only.

---

### `app/api/paste/route.ts` (controller, request-response) -- MODIFY

**Analog:** itself

**Imports pattern** (lines 1-3):
```typescript
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createPaste } from "@/lib/db/queries";
```

**Core POST pattern** (lines 7-63):
```typescript
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content } = body as { content?: string };

  // Validation checks returning 400/413...

  const id = nanoid(8);
  const now = Math.floor(Date.now() / 1000);

  try {
    createPaste({
      id,
      content,
      createdAt: now,
      expiresAt: null,
      sizeBytes,
    });
  } catch (err: unknown) {
    // collision retry...
  }

  return NextResponse.json({ id, url: `/${id}` }, { status: 201 });
}
```

**Modification points:**
1. Add import: `import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";`
2. Destructure `expiration` from body alongside `content` (line 15)
3. Add validation after content checks: validate `expiration` against `VALID_EXPIRATIONS`, return 400 if invalid
4. Compute `expiresAt` via `computeExpiresAt(now, expirationValue)` instead of hardcoded `null` (line 40)
5. Send `expiration` in the `JSON.stringify({ content })` body (client-side change in paste-form.tsx)

---

### `app/api/paste/[id]/route.ts` (controller, request-response) -- MODIFY

**Analog:** itself

**Full file** (lines 1-21):
```typescript
import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const paste = getPasteById(id);
  if (!paste) {
    return NextResponse.json({ error: "Paste not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: paste.id,
    content: paste.content,
    created_at: paste.createdAt,
    expires_at: paste.expiresAt,
  });
}
```

**Modification point:** Insert expiration check between the `!paste` check (line 12) and the success response (line 15):
```typescript
if (paste.expiresAt && Date.now() / 1000 > paste.expiresAt) {
  return NextResponse.json({ error: "This paste has expired" }, { status: 410 });
}
```

---

### `app/api/paste/[id]/raw/route.ts` (controller, request-response) -- MODIFY

**Analog:** itself

**Full file** (lines 1-19):
```typescript
import { getPasteById } from "@/lib/db/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const paste = getPasteById(id);
  if (!paste) {
    return new Response("Paste not found", { status: 404 });
  }

  return new Response(paste.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
```

**Modification point:** Insert expiration check between the `!paste` check (line 11) and the success response (line 14):
```typescript
if (paste.expiresAt && Date.now() / 1000 > paste.expiresAt) {
  return new Response("This paste has expired", { status: 410 });
}
```

**Note:** This route uses `new Response()` not `NextResponse.json()` -- maintain that pattern for consistency.

---

### `app/api/cleanup/route.ts` (controller, request-response) -- NEW

**Analog:** `app/api/paste/[id]/route.ts`

**Imports pattern** (lines 1-2):
```typescript
import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";
```

**Route handler signature pattern** (lines 4-7):
```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
```

**Response pattern** (lines 12-13, 15-20):
```typescript
// Error response:
return NextResponse.json({ error: "Paste not found" }, { status: 404 });

// Success response:
return NextResponse.json({
  id: paste.id,
  content: paste.content,
  // ...
});
```

**Concrete guidance for cleanup route:**
- Use `DELETE` method export (not GET/POST)
- No `params` needed (no dynamic segment)
- Auth check: read `Authorization` header, compare against `process.env.CLEANUP_SECRET`
- Return `NextResponse.json({ deleted: number })` on success
- Return `NextResponse.json({ error: "..." }, { status: 401 })` for auth failure
- Return `NextResponse.json({ error: "..." }, { status: 503 })` if `CLEANUP_SECRET` not configured

---

### `app/proxy.ts` (middleware, request-response) -- NEW

**Analog (styling):** `app/not-found.tsx`

**410 page styling pattern** (not-found.tsx lines 1-13):
```typescript
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-4xl font-bold text-gray-400">404</h1>
      <p className="mb-8 text-gray-500">Paste not found</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
```

**Analog (logic):** `app/api/paste/[id]/route.ts` (lines 10-13)

```typescript
const paste = getPasteById(id);
if (!paste) {
  return NextResponse.json({ error: "Paste not found" }, { status: 404 });
}
```

**Concrete guidance:**
- The 410 HTML response body should mirror the not-found.tsx visual pattern: centered layout, large status code heading (`410` instead of `404`), descriptive message ("This paste has expired." instead of "Paste not found"), link back to home
- Use inline styles in the HTML (not Tailwind classes) since proxy.ts returns raw HTML, not a React component
- Import `getPasteById` from `@/lib/db/queries` and `NextResponse` from `next/server`
- Export named function `proxy(request: NextRequest)` with `config.matcher` for slug pattern

---

### `app/[slug]/page.tsx` (component, request-response) -- MODIFY

**Analog:** itself

**Full file** (lines 1-25):
```typescript
import { notFound } from "next/navigation";
import { getPasteById } from "@/lib/db/queries";
import { MarkdownRenderer } from "@/app/components/markdown-renderer";

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

  return (
    <main className="mx-auto max-w-3xl p-8">
      <MarkdownRenderer content={paste.content} />
      <p className="mt-4 text-sm text-gray-500">
        Created: {new Date(paste.createdAt * 1000).toISOString()}
      </p>
    </main>
  );
}
```

**Modification points:**
1. Add import: `import { PasteView } from "./components/paste-view";`
2. Replace direct `<MarkdownRenderer>` usage with `<PasteView>` wrapper that receives both `content` (string) and `renderedContent` (`<MarkdownRenderer content={paste.content} />` as JSX)
3. Optionally display expiration info (e.g., "Expires in X days") if `paste.expiresAt` is set
4. No expiration redirect needed here -- proxy.ts handles 410 before this page renders

---

### `app/[slug]/components/paste-view.tsx` (component, event-driven) -- NEW

**Analog:** `app/components/paste-form.tsx` (tab toggle pattern, lines 73-99)

**Client Component directive** (line 1):
```typescript
"use client";
```

**Imports pattern** (lines 3-4):
```typescript
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
```

**Tab toggle pattern** (lines 14, 73-99):
```typescript
const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

// Tab bar JSX:
<div className="flex rounded-lg border border-gray-200 overflow-hidden md:hidden">
  <button
    type="button"
    onClick={() => setActiveTab("edit")}
    aria-pressed={activeTab === "edit"}
    className={`flex-1 py-2 text-sm font-medium text-center ${
      activeTab === "edit"
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-600"
    }`}
  >
    Edit
  </button>
  <button
    type="button"
    onClick={() => setActiveTab("preview")}
    aria-pressed={activeTab === "preview"}
    className={`flex-1 py-2 text-sm font-medium text-center ${
      activeTab === "preview"
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-600"
    }`}
  >
    Preview
  </button>
</div>
```

**Concrete guidance:**
- Copy the tab bar structure exactly from paste-form.tsx lines 74-99
- Change tab values from `"edit" | "preview"` to `"rendered" | "raw"`
- Remove `md:hidden` -- this toggle should be visible at all screen sizes (paste-form uses it for mobile only; paste-view uses it always)
- Add `mb-4` to the tab bar container for spacing above content
- Props: `content: string` (raw text) and `renderedContent: React.ReactNode` (pre-rendered server component output)
- Raw view: `<pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm">{content}</pre>`
- Rendered view: just render `{renderedContent}` directly
- Minimal imports: only `useState` from React (no router, no debounce, no draft hooks)

---

### `app/components/paste-form.tsx` (component, event-driven) -- MODIFY

**Analog:** itself

**State declarations pattern** (lines 11-14):
```typescript
const [content, setContent] = useState("");
const [error, setError] = useState("");
const [submitting, setSubmitting] = useState(false);
const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
```

**Form submission pattern** (lines 47-51):
```typescript
const res = await fetch("/api/paste", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content }),
});
```

**Form controls area** (lines 127-139):
```typescript
{error && (
  <p role="alert" className="text-sm text-red-600">
    {error}
  </p>
)}
<button
  type="submit"
  disabled={submitting}
  className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
>
  {submitting ? "Creating..." : "Create Paste"}
</button>
```

**Modification points:**
1. Add state: `const [expiration, setExpiration] = useState("never");`
2. Add `<select>` element between the split-pane container and the error message/submit button area
3. Style the `<select>` consistently with the textarea: `className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"`
4. Include `expiration` in the fetch body: `JSON.stringify({ content, expiration })`

---

### `lib/db/queries.ts` (service, CRUD) -- MODIFY

**Analog:** itself

**Full file** (lines 1-11):
```typescript
import { eq } from "drizzle-orm";
import { db } from "./index";
import { pastes, type Paste, type NewPaste } from "./schema";

export function getPasteById(id: string): Paste | undefined {
  return db.select().from(pastes).where(eq(pastes.id, id)).get();
}

export function createPaste(data: NewPaste): Paste {
  return db.insert(pastes).values(data).returning().get();
}
```

**Modification points:**
1. Add imports: `import { and, lt, isNotNull } from "drizzle-orm";` (extend existing `eq` import)
2. Add `deleteExpiredPastes()` function following the same pattern: synchronous, named export, no default export
3. Use `db.delete(pastes).where(and(isNotNull(pastes.expiresAt), lt(pastes.expiresAt, now))).run()` -- `.run()` returns `{ changes: number }`

---

### `tests/lib/expiration.test.ts` (test, transform) -- NEW

**Analog:** `tests/lib/db.test.ts`

**Test file structure** (lines 1-6):
```typescript
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createPaste, getPasteById } from "@/lib/db/queries";
import { pastes } from "@/lib/db/schema";
import { like } from "drizzle-orm";
```

**Test pattern** (lines 54-66):
```typescript
describe("query functions", () => {
  it("CORE-04: createPaste stores and retrieves paste with valid data", () => {
    const now = Math.floor(Date.now() / 1000);
    const input = { /* ... */ };
    const created = createPaste(input);
    expect(created.id).toBe("test1234");
    // ...
  });
});
```

**Concrete guidance:**
- Import `computeExpiresAt` and `VALID_EXPIRATIONS` from `@/lib/expiration`
- No database access needed -- pure function tests
- No `afterEach` cleanup needed
- Use `STOR-02` prefix in test names for traceability
- Test: each valid expiration string produces correct offset from `createdAt`
- Test: `"never"` returns `null`
- Test: unknown string returns `null`
- Test: `VALID_EXPIRATIONS` contains all expected values

---

### `tests/api/cleanup.test.ts` (test, request-response) -- NEW

**Analog:** `tests/api/paste.test.ts`

**Test file structure** (lines 1-8):
```typescript
import { describe, it, expect, afterEach } from "vitest";
import { POST } from "@/app/api/paste/route";
import { GET } from "@/app/api/paste/[id]/route";
import { GET as GET_RAW } from "@/app/api/paste/[id]/raw/route";
import { db } from "@/lib/db";
import { pastes } from "@/lib/db/schema";
import { like } from "drizzle-orm";
```

**Request factory pattern** (lines 22-28):
```typescript
function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/paste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
```

**Route handler invocation pattern** (lines 124-126):
```typescript
const getResponse = await GET(getRequest, {
  params: Promise.resolve({ id: createData.id }),
});
```

**Cleanup pattern** (lines 9-20):
```typescript
const createdIds: string[] = [];

afterEach(() => {
  for (const id of createdIds) {
    db.delete(pastes)
      .where(like(pastes.id, id))
      .run();
  }
  createdIds.length = 0;
});
```

**Concrete guidance:**
- Import `DELETE` from `@/app/api/cleanup/route`
- Create test helper to insert expired/non-expired pastes directly via `createPaste`
- Set `process.env.CLEANUP_SECRET` in test setup, restore in teardown
- Test with `STOR-04` prefix for traceability
- Create `makeDeleteRequest` helper following the `makePostRequest` pattern:
  ```typescript
  function makeDeleteRequest(secret?: string): Request {
    const headers: Record<string, string> = {};
    if (secret) {
      headers["Authorization"] = `Bearer ${secret}`;
    }
    return new Request("http://localhost/api/cleanup", {
      method: "DELETE",
      headers,
    });
  }
  ```
- Test cases: 401 without secret, 401 with wrong secret, 503 without env var, success with valid secret (verify expired rows deleted, non-expired rows preserved, returns `{ deleted: N }`)

---

## Shared Patterns

### Response Formatting
**Source:** `app/api/paste/[id]/route.ts` lines 12-13, 15-20
**Apply to:** All API route files (`route.ts`, `[id]/route.ts`, `[id]/raw/route.ts`, `cleanup/route.ts`)

JSON error responses:
```typescript
return NextResponse.json({ error: "Error message" }, { status: CODE });
```

JSON success responses:
```typescript
return NextResponse.json({ key: value });
```

Plain text responses (raw route only):
```typescript
return new Response("text", { status: CODE });
```

### Unix Timestamp Convention
**Source:** `app/api/paste/route.ts` line 33
**Apply to:** All files computing or comparing timestamps

```typescript
const now = Math.floor(Date.now() / 1000);
```

Always divide `Date.now()` by 1000 -- the schema stores Unix seconds, not milliseconds.

### Expiration Check Pattern
**Source:** Derived from existing `!paste` null check in `app/api/paste/[id]/route.ts` lines 11-13
**Apply to:** `app/api/paste/[id]/route.ts`, `app/api/paste/[id]/raw/route.ts`, `app/proxy.ts`

```typescript
// Always check AFTER the null/not-found check, BEFORE serving content
if (paste.expiresAt && Date.now() / 1000 > paste.expiresAt) {
  // return 410
}
```

### Client Component Directive
**Source:** `app/components/paste-form.tsx` line 1
**Apply to:** `app/[slug]/components/paste-view.tsx`

```typescript
"use client";
```

First line of every interactive client component.

### Tab Toggle Styling
**Source:** `app/components/paste-form.tsx` lines 74-99
**Apply to:** `app/[slug]/components/paste-view.tsx`

Active tab: `"bg-blue-600 text-white"`
Inactive tab: `"bg-white text-gray-600"`
Container: `"flex rounded-lg border border-gray-200 overflow-hidden"`
Button: `"flex-1 py-2 text-sm font-medium text-center"`
Accessibility: `aria-pressed={activeTab === "value"}`

### Test Infrastructure
**Source:** `tests/api/paste.test.ts` lines 1-20, `tests/lib/db.test.ts` lines 1-5
**Apply to:** `tests/lib/expiration.test.ts`, `tests/api/cleanup.test.ts`

```typescript
import { describe, it, expect, afterEach } from "vitest";
```

- Use `@/` path alias for imports
- Use `vitest` globals (`describe`, `it`, `expect`)
- Clean up test data in `afterEach` using `db.delete(pastes).where(like(pastes.id, "test%")).run()`
- Prefix test names with requirement IDs (e.g., `"STOR-02: ..."`)
- Use direct route handler imports and invoke with `Request` objects (no HTTP server needed)

### Drizzle Query Pattern
**Source:** `lib/db/queries.ts` lines 1-11
**Apply to:** `lib/db/queries.ts` (new `deleteExpiredPastes` function)

```typescript
// All query functions are:
// - Synchronous (better-sqlite3 driver)
// - Named exports (no default)
// - Single responsibility
// - Return typed results (Paste | undefined, Paste, number)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/proxy.ts` | middleware | request-response | No existing proxy/middleware in the codebase. This is a new file convention for Next.js 16. Pattern derived from Next.js docs + existing not-found.tsx styling + existing API route logic. |

**Note:** While `app/proxy.ts` has no direct analog, its logic is a composition of two existing patterns (database lookup from API routes + error page styling from not-found.tsx). The research provides a complete code example that follows these patterns.

## Metadata

**Analog search scope:** Full project tree (`/home/grafuls/Sources/paste.md/`)
**Files scanned:** 21 TypeScript/TSX files (all non-node_modules, non-.next)
**Pattern extraction date:** 2026-05-14
