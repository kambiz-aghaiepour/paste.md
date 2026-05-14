# Phase 2: Markdown Rendering & Editor - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 8 (5 new, 3 modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/components/markdown-renderer.tsx` (NEW) | component | request-response (SSR) | `app/[slug]/page.tsx` | role-match |
| `app/components/markdown-preview.tsx` (NEW) | component | transform (client) | `app/components/paste-form.tsx` | role-match |
| `app/components/draft-indicator.tsx` (NEW) | component | event-driven (client) | `app/components/paste-form.tsx` | role-match |
| `lib/hooks/use-debounce.ts` (NEW) | hook | transform | (no hook analog -- new pattern) | no-analog |
| `lib/hooks/use-local-storage-draft.ts` (NEW) | hook | event-driven | (no hook analog -- new pattern) | no-analog |
| `app/[slug]/page.tsx` (MODIFIED) | component | request-response (SSR) | self (current version) | exact |
| `app/components/paste-form.tsx` (MODIFIED) | component | request-response (client) | self (current version) | exact |
| `app/globals.css` (MODIFIED) | config | static | self (current version) | exact |

## Pattern Assignments

### `app/components/markdown-renderer.tsx` (NEW -- Server Component, SSR transform)

**Analog:** `app/[slug]/page.tsx` (Server Component pattern)

**Server Component pattern** (lines 1-2, 4-14):
This file establishes the async Server Component pattern with `@/` path alias imports and no `"use client"` directive.
```typescript
import { notFound } from "next/navigation";
import { getPasteById } from "@/lib/db/queries";

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
```

**Styling pattern** (lines 17-19):
Container uses Tailwind utility classes directly. No CSS modules. The new component should use `prose` + `max-w-none` instead of the `<pre>` block.
```typescript
  return (
    <main className="mx-auto max-w-3xl p-8">
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-6 font-mono text-sm">
```

**Key differences for new file:**
- `markdown-renderer.tsx` is NOT a page component -- it is a reusable async Server Component. It should be an `async function` (not `export default`), exported as a named export.
- It receives `content: string` as a prop, not route params.
- It wraps `MarkdownAsync` from `react-markdown` with `remarkGfm`, `rehypeSanitize`, and `rehypeShiki` plugins.
- No `"use client"` directive -- this is a Server Component.

---

### `app/components/markdown-preview.tsx` (NEW -- Client Component, client-side transform)

**Analog:** `app/components/paste-form.tsx` (Client Component pattern)

**Client Component directive and imports** (lines 1-4):
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
```

**Component structure** (lines 6, 44-66):
Named export function, JSX return with Tailwind classes. No default export.
```typescript
export function PasteForm() {
  // ...
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste your Markdown here..."
        className="min-h-64 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
      {/* conditional rendering pattern */}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
```

**Key differences for new file:**
- `markdown-preview.tsx` receives `content: string` as a prop.
- Uses `Markdown` (synchronous, default export) from `react-markdown`, not `MarkdownAsync`.
- Plugins: `remarkGfm` + `rehypeSanitize` only (no Shiki).
- Wraps output in `<div className="prose prose-gray max-w-none">` with `role="region"` and `aria-live="polite"` for accessibility.

---

### `app/components/draft-indicator.tsx` (NEW -- Client Component, event-driven UI)

**Analog:** `app/components/paste-form.tsx` (Client Component with conditional rendering)

**Client Component directive** (line 1):
```typescript
"use client";
```

**Conditional rendering pattern** (lines 52-55):
```typescript
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
```

**Key differences for new file:**
- `draft-indicator.tsx` is a standalone notification component with auto-dismiss (3-second timeout via `useEffect`/`setTimeout`).
- Accepts `visible: boolean` and `onDismiss: () => void` props.
- Uses `role="status"` (informational) rather than `role="alert"` (error).
- Includes a dismiss button with `aria-label`.
- Uses `useState` for local show state and `useEffect` for auto-dismiss timer cleanup.

---

### `lib/hooks/use-debounce.ts` (NEW -- Custom hook, no analog)

**No direct analog in codebase.** The `lib/` directory currently contains only `db/`. This is the first custom hook.

**Directory pattern from** `lib/db/index.ts` (lines 1-2):
```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
```

**Key patterns to follow:**
- Create new `lib/hooks/` directory.
- File must include `"use client"` directive since hooks use React state/effects.
- Named export (not default export), consistent with all other exports in the project.
- Uses `@/` path alias when imported from components.
- The hook is a pure utility: `useDebounce<T>(value: T, delay: number): T`.
- Uses `useState` + `useEffect` with cleanup (`clearTimeout`).

---

### `lib/hooks/use-local-storage-draft.ts` (NEW -- Custom hook, no analog)

**No direct analog in codebase.** Same new directory as `use-debounce.ts`.

**Key patterns to follow:**
- `"use client"` directive.
- Named export: `useLocalStorageDraft()`.
- Returns an object with `{ restoredDraft, wasRestored, saveDraft, clearDraft, dismissRestored }`.
- All localStorage access wrapped in try/catch (handles SSR, private browsing, QuotaExceededError).
- localStorage read happens in `useEffect` only (not during render) to avoid hydration mismatch.
- Uses `useCallback` for memoized save/clear/dismiss functions.
- Storage key: `paste-md-draft`.

---

### `app/[slug]/page.tsx` (MODIFIED -- replace `<pre>` with `<MarkdownRenderer>`)

**Current file** (full, lines 1-27):
```typescript
import { notFound } from "next/navigation";
import { getPasteById } from "@/lib/db/queries";

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
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-6 font-mono text-sm">
        {paste.content}
      </pre>
      <p className="mt-4 text-sm text-gray-500">
        Created: {new Date(paste.createdAt * 1000).toISOString()}
      </p>
    </main>
  );
}
```

**Modification:**
- Add import: `import { MarkdownRenderer } from "@/app/components/markdown-renderer";`
- Replace the `<pre>...</pre>` block (lines 18-20) with `<MarkdownRenderer content={paste.content} />`
- Keep the `<main>` wrapper, `<p>` timestamp, and all other structure intact.
- This remains an async Server Component -- no directive change needed.

---

### `app/components/paste-form.tsx` (MODIFIED -- add split-pane, preview, localStorage)

**Current file** (full, lines 1-66):
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PasteForm() {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!content.trim()) {
      setError("Content cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create paste");
        return;
      }

      const data = await res.json();
      router.push(data.url);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste your Markdown here..."
        className="min-h-64 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
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
    </form>
  );
}
```

**Modifications required:**
1. **New imports:** Add `useDebounce` from `@/lib/hooks/use-debounce`, `useLocalStorageDraft` from `@/lib/hooks/use-local-storage-draft`, `MarkdownPreview` from `@/app/components/markdown-preview`, `DraftIndicator` from `@/app/components/draft-indicator`, and `useEffect` from `react`.
2. **New state:** Add `activeTab` state for mobile toggle (`"edit" | "preview"`).
3. **Hook integration:** Call `useDebounce(content, 300)` for preview, `useDebounce(content, 1000)` for localStorage save, and `useLocalStorageDraft()` for draft persistence.
4. **Draft restore:** In a `useEffect`, if `restoredDraft` is non-null, call `setContent(restoredDraft)`.
5. **Draft save:** In a `useEffect` watching the 1s-debounced value, call `saveDraft(debouncedContent)`.
6. **Draft clear:** After successful paste creation (after `router.push`), call `clearDraft()`.
7. **Layout change:** Wrap textarea and preview in a `grid grid-cols-1 md:grid-cols-2 gap-4` container.
8. **Mobile toggle:** Add toggle button visible only below `md` breakpoint. Controls which pane is visible.
9. **Preview pane:** Render `<MarkdownPreview content={debouncedPreviewContent} />` in the right/bottom pane.
10. **Draft indicator:** Render `<DraftIndicator visible={wasRestored} onDismiss={dismissRestored} />` above the editor.

---

### `app/globals.css` (MODIFIED -- add typography plugin)

**Current file** (line 1):
```css
@import "tailwindcss";
```

**Modification:**
Add `@plugin "@tailwindcss/typography";` after the import line:
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

---

## Shared Patterns

### Import Path Convention
**Source:** All files in `app/` and `lib/`
**Apply to:** All new and modified files
```typescript
// Use @/ path alias for all cross-directory imports
import { getPasteById } from "@/lib/db/queries";
import { PasteForm } from "@/app/components/paste-form";
```

### Named Exports (not default)
**Source:** `app/components/paste-form.tsx` line 6, `lib/db/queries.ts` lines 5 and 9
**Apply to:** All new component and hook files
```typescript
// Components use named exports
export function PasteForm() { ... }
export function getPasteById(id: string) { ... }
export function createPaste(data: NewPaste) { ... }
```
Exception: Page components (`page.tsx`) use `export default`.

### Client Component Directive
**Source:** `app/components/paste-form.tsx` line 1
**Apply to:** `markdown-preview.tsx`, `draft-indicator.tsx`, `use-debounce.ts`, `use-local-storage-draft.ts`
```typescript
"use client";
```
Server Components (like `markdown-renderer.tsx`) omit this directive.

### Tailwind Utility Classes (no CSS modules)
**Source:** All components
**Apply to:** All new components
```typescript
// Inline Tailwind classes, no CSS module imports
className="min-h-64 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm"
```

### Error/Status Conditional Rendering
**Source:** `app/components/paste-form.tsx` lines 52-55
**Apply to:** `draft-indicator.tsx`, modified `paste-form.tsx`
```typescript
{error && (
  <p role="alert" className="text-sm text-red-600">
    {error}
  </p>
)}
```

### Test File Structure
**Source:** `tests/api/paste.test.ts` lines 1-6, 30-31
**Apply to:** New test files for this phase
```typescript
import { describe, it, expect, afterEach } from "vitest";

// Test files live in tests/ mirroring the source structure:
// tests/components/markdown-renderer.test.tsx
// tests/components/markdown-preview.test.tsx
// tests/hooks/use-local-storage-draft.test.ts

describe("component/feature name", () => {
  it("REQ-ID: behavior description", async () => {
    // ...
    expect(result).toBe(expected);
  });
});
```

### Vitest Configuration
**Source:** `vitest.config.ts` lines 1-14
**Apply to:** Test setup awareness -- `@/` alias is configured, environment is `node`
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
```
Note: Component tests for `markdown-preview.tsx` and `draft-indicator.tsx` may need `environment: "jsdom"` or per-file environment override. The current config uses `"node"` which works for API/DB tests but not React component rendering tests.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/hooks/use-debounce.ts` | hook | transform | No hooks directory or custom hooks exist yet. First hook in the project. Use RESEARCH.md Pattern 3 for implementation. |
| `lib/hooks/use-local-storage-draft.ts` | hook | event-driven | No hooks directory or custom hooks exist yet. Use RESEARCH.md Pattern 4 for implementation. |

Both hooks follow well-established React patterns. The RESEARCH.md provides complete, verified implementations. The planner should reference RESEARCH.md Patterns 3 and 4 directly.

## Metadata

**Analog search scope:** `app/`, `lib/`, `tests/`
**Files scanned:** 14 source files (8 app/, 3 lib/, 2 tests/, 1 config)
**Pattern extraction date:** 2026-05-14
