# Phase 5: UI Polish & Experience - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 17 (5 new, 12 modified)
**Analogs found:** 17 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/components/header.tsx` | component | request-response (static layout) | `app/layout.tsx` | role-match |
| `app/components/theme-toggle.tsx` | component | event-driven (user click + localStorage) | `app/components/draft-indicator.tsx` | role-match |
| `app/components/theme-script.tsx` | component | request-response (SSR inline script) | `app/layout.tsx` | partial-match |
| `app/components/copy-button.tsx` | component | event-driven (user click + clipboard API) | `app/components/draft-indicator.tsx` | role-match |
| `app/components/copyable-pre.tsx` | component | event-driven (wraps pre with copy) | `app/[slug]/components/paste-view.tsx` | role-match |
| `app/layout.tsx` | config/layout | request-response | self (existing) | exact |
| `app/globals.css` | config/style | N/A (CSS) | self (existing) | exact |
| `app/components/markdown-renderer.tsx` | component | request-response (SSR) | self (existing) | exact |
| `app/components/markdown-preview.tsx` | component | event-driven (client preview) | self (existing) | exact |
| `app/components/paste-form.tsx` | component | event-driven (form + tabs) | self (existing) | exact |
| `app/components/draft-indicator.tsx` | component | event-driven (notification) | self (existing) | exact |
| `app/[slug]/components/paste-view.tsx` | component | event-driven (tab toggle) | self (existing) | exact |
| `app/page.tsx` | page | request-response | self (existing) | exact |
| `app/[slug]/page.tsx` | page | request-response | self (existing) | exact |
| `app/not-found.tsx` | page | request-response | self (existing) | exact |
| `app/proxy.ts` | middleware | request-response | self (existing) | exact |
| `next.config.ts` | config | N/A | self (existing) | exact |
| `tests/components/theme.test.ts` | test | N/A | `tests/components/markdown-renderer.test.tsx` | role-match |
| `tests/components/copy-button.test.ts` | test | N/A | `tests/components/markdown-renderer.test.tsx` | role-match |
| `tests/components/markdown-renderer.test.tsx` | test | N/A | self (existing, modify) | exact |
| `tests/security/headers.test.ts` | test | N/A | self (existing, modify) | exact |

## Pattern Assignments

### `app/components/header.tsx` (NEW - component, static layout)

**Analog:** `app/layout.tsx` (lines 1-19)

This is a Server Component (no interactivity in the header itself -- the theme toggle is a separate Client Component composed inside it).

**Imports pattern** -- follows project convention of `@/` path alias and named exports:
```typescript
// app/layout.tsx lines 1-2
import type { Metadata } from "next";
import "./globals.css";
```

New file should import:
```typescript
import Link from "next/link";
import { ThemeToggle } from "@/app/components/theme-toggle";
```

**Core pattern** -- functional component with Tailwind utility classes, no `"use client"` directive (Server Component by default):
```typescript
// Based on layout.tsx structure (lines 9-19) -- Server Component, JSX return
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

The header should follow the same pattern: named export, props interface, Tailwind classes. Contains "paste.md" branding link on left, `ThemeToggle` on right.

---

### `app/components/theme-toggle.tsx` (NEW - component, event-driven)

**Analog:** `app/components/draft-indicator.tsx` (lines 1-47)

Both are Client Components with `useState`/`useEffect`, event handlers, and conditional rendering.

**Imports pattern** (lines 1-2):
```typescript
"use client";

import { useState, useEffect } from "react";
```

**Interface pattern** (lines 5-8):
```typescript
interface DraftIndicatorProps {
  visible: boolean;
  onDismiss: () => void;
}
```

ThemeToggle needs no props (reads from localStorage directly), so it will have an internal `Theme` type instead.

**Core pattern -- Client Component with state + effects + event handler** (lines 10-27):
```typescript
export function DraftIndicator({ visible, onDismiss }: DraftIndicatorProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      setShow(false);
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);
```

ThemeToggle should follow the same structure: `useState` for theme state, `useEffect` to read localStorage on mount, click handler to cycle themes.

**Accessibility pattern** (lines 35-39):
```typescript
<button
  onClick={() => { /* handler */ }}
  className="text-blue-400 hover:text-blue-600"
  aria-label="Dismiss draft notification"
>
```

ThemeToggle button needs `aria-label` describing current theme state.

---

### `app/components/theme-script.tsx` (NEW - component, SSR inline script)

**Analog:** `app/layout.tsx` (lines 14-16 -- the `<html>` and `<body>` rendering)

This is a Server Component that renders a blocking `<script>` tag via `dangerouslySetInnerHTML`. No direct analog exists in the codebase, but it follows the same Server Component pattern as `layout.tsx`.

**Core pattern:**
```typescript
// Server Component (no "use client"), renders static content
// The script string is a constant, enabling SHA-256 hash for CSP
const THEME_SCRIPT = `(function(){...})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
```

**CSP integration** -- `next.config.ts` lines 5-8 show the CSP construction:
```typescript
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // ...
].join("; ");
```

The FOWT script hash (`sha256-<hash>`) must be added to the `script-src` directive in production.

---

### `app/components/copy-button.tsx` (NEW - component, event-driven)

**Analog:** `app/components/draft-indicator.tsx` (lines 1-47)

Same pattern as theme-toggle: Client Component with useState for feedback state (copied/not-copied), async click handler, auto-reset via setTimeout.

**Imports pattern** (lines 1-2):
```typescript
"use client";

import { useState } from "react";
```

**Core pattern -- button with transient state feedback** (adapted from lines 17-25 of draft-indicator.tsx):
```typescript
// DraftIndicator uses setTimeout to auto-dismiss -- same pattern for "Copied!" feedback
useEffect(() => {
  if (!show) return;
  const timer = setTimeout(() => {
    setShow(false);
    onDismiss();
  }, 3000);
  return () => clearTimeout(timer);
}, [show, onDismiss]);
```

Copy button adapts this: `setCopied(true)` on click, `setTimeout(() => setCopied(false), 2000)` for auto-reset.

**Accessibility pattern** (from draft-indicator.tsx lines 35-39):
```typescript
<button
  onClick={() => { /* handler */ }}
  aria-label="Dismiss draft notification"
>
```

Copy button needs `aria-label={copied ? "Copied" : "Copy code"}`.

---

### `app/components/copyable-pre.tsx` (NEW - component, wrapper)

**Analog:** `app/[slug]/components/paste-view.tsx` (lines 1-52)

Both are Client Components that wrap content with additional UI (PasteView wraps rendered content with tab toggle; CopyablePre wraps `<pre>` with copy button).

**Imports pattern** (lines 1-3):
```typescript
"use client";

import { useState } from "react";
```

CopyablePre should import:
```typescript
"use client";

import { useRef } from "react";
import { CopyButton } from "@/app/components/copy-button";
```

**Core pattern -- wrapper component with props passthrough** (lines 11-51):
```typescript
export function PasteView({ content, renderedContent }: PasteViewProps) {
  // ...
  return (
    <div>
      {/* UI controls */}
      {/* Wrapped content */}
    </div>
  );
}
```

CopyablePre follows the same wrapper pattern: receives `children` and `...props`, renders a `<div className="relative group">` containing the original `<pre>` plus a positioned `CopyButton`.

---

### `app/layout.tsx` (MODIFIED - layout)

**Current state** (lines 1-19):
```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "paste.md",
  description: "A Markdown pastebin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

**Modifications needed:**
1. Import `ThemeScript` and `Header` components
2. Add `<ThemeScript />` inside `<head>` (before body)
3. Add `<Header />` inside `<body>` before `{children}`
4. Add `bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100` to `<body>`
5. Add `suppressHydrationWarning` to `<html>` (because the FOWT script modifies the class before React hydrates)

---

### `app/globals.css` (MODIFIED - CSS config)

**Current state** (lines 1-2):
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

**Modifications needed:**
1. Add `@custom-variant dark (&:where(.dark, .dark *));` for class-based dark mode
2. Add Shiki dark theme CSS activation rules (`html.dark .shiki, html.dark .shiki span`)

---

### `app/components/markdown-renderer.tsx` (MODIFIED - Server Component)

**Current state** (lines 1-24):
```typescript
import { MarkdownAsync } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeShiki from "@shikijs/rehype";

interface MarkdownRendererProps {
  content: string;
}

export async function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-gray max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-img:rounded-lg">
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSanitize,
          [rehypeShiki, { theme: "github-light" }],
        ]}
      >
        {content}
      </MarkdownAsync>
    </article>
  );
}
```

**Modifications needed:**
1. Change `{ theme: "github-light" }` to `{ themes: { light: "github-light", dark: "github-dark" }, defaultColor: "light" }` (D-04)
2. Add `dark:prose-invert` to the article className (D-05)
3. Add `prose-pre:overflow-x-auto` for mobile code block scrolling (D-11)

---

### `app/components/markdown-preview.tsx` (MODIFIED - Client Component)

**Current state** (lines 1-27):
```typescript
"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div
      className="prose prose-gray max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-img:rounded-lg"
      role="region"
      aria-label="Markdown preview"
      aria-live="polite"
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content}
      </Markdown>
    </div>
  );
}
```

**Modifications needed:**
1. Add `dark:prose-invert` to the div className (D-05)
2. Optionally add `components={{ pre: CopyablePre }}` for copy-to-clipboard in preview (D-10, Claude's discretion)

---

### `app/components/paste-form.tsx` (MODIFIED - Client Component)

**Current tab toggle pattern** (lines 75-100) -- this is the canonical tab pattern used throughout the app:
```typescript
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
```

**Dark mode additions needed for tab toggle:**
```typescript
// Inactive state: add dark: variants
"bg-white text-gray-600"
// becomes:
"bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
```

**All hardcoded colors requiring dark variants** (from full file scan):
- Line 75: `border-gray-200` -> add `dark:border-gray-700`
- Lines 81-83, 92-94: inactive tab `bg-white text-gray-600` -> add `dark:bg-gray-800 dark:text-gray-300`
- Line 113: textarea `border-gray-300` -> add `dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100`
- Line 119: preview border `border-gray-200` -> add `dark:border-gray-700`
- Line 123: preview label `text-gray-500` -> add `dark:text-gray-400`
- Line 138: select `border-gray-300` -> add `dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100`
- Line 112: add `min-h-[44px]` to buttons for mobile touch targets (D-12)

---

### `app/[slug]/components/paste-view.tsx` (MODIFIED - Client Component)

**Current tab toggle pattern** (lines 16-41) -- identical pattern to paste-form.tsx:
```typescript
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
```

**Dark mode additions needed:**
- Line 16: `border-gray-200` -> add `dark:border-gray-700`
- Lines 22-24, 32-34: inactive tab -> add `dark:bg-gray-800 dark:text-gray-300`
- Line 46: raw view `border-gray-200 bg-gray-50` -> add `dark:border-gray-700 dark:bg-gray-900`

---

### `app/components/draft-indicator.tsx` (MODIFIED - Client Component)

**Current styling** (lines 32-33):
```typescript
<div
  role="status"
  className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700"
>
```

**Dark mode additions needed:**
- `border-blue-200` -> add `dark:border-blue-800`
- `bg-blue-50` -> add `dark:bg-blue-950`
- `text-blue-700` -> add `dark:text-blue-300`
- Line 42: `text-blue-400 hover:text-blue-600` -> add `dark:text-blue-500 dark:hover:text-blue-300`

---

### `app/not-found.tsx` (MODIFIED - Server Component)

**Current state** (lines 1-13):
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

**Dark mode additions:**
- Line 6: `text-gray-400` -> add `dark:text-gray-500`
- Line 7: `text-gray-500` -> add `dark:text-gray-400`
- Line 8: `text-blue-600` -> add `dark:text-blue-400`

---

### `app/page.tsx` (MODIFIED - Server Component)

**Current state** (lines 1-9):
```typescript
import { PasteForm } from "@/app/components/paste-form";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-3xl font-bold">paste.md</h1>
      <PasteForm />
    </main>
  );
}
```

**Modifications needed:**
- Line 5: `p-8` -> `p-4 sm:p-8` for responsive padding (D-13)
- If header is added globally in layout.tsx, the `<h1>` on this page may be removed or adjusted

---

### `app/[slug]/page.tsx` (MODIFIED - Server Component)

**Current state** (lines 34-51):
```typescript
return (
  <main className="mx-auto max-w-3xl p-8">
    <PasteView ... />
    <p className="mt-4 text-sm text-gray-500">
      Created: {new Date(paste.createdAt * 1000).toISOString()}
    </p>
    {remaining !== null && remaining > 0 && (
      <p className="text-sm text-gray-500">
        Expires in {formatRelativeTime(remaining)}
      </p>
    )}
  </main>
);
```

**Modifications needed:**
- Line 35: `p-8` -> `p-4 sm:p-8` for responsive padding (D-13)
- Lines 38, 42: `text-gray-500` -> add `dark:text-gray-400`

---

### `app/proxy.ts` (MODIFIED - middleware)

**Current 410 page** (lines 57-66):
```typescript
return new Response(
  `<!DOCTYPE html>
<html lang="en">
<head>...</head>
<body style="margin:0;min-height:100vh;display:flex;...">
  <h1 style="...;color:#9ca3af">410</h1>
  <p style="...;color:#6b7280">This paste has expired.</p>
  <a href="/" style="color:#2563eb;text-decoration:none">Back to home</a>
</body>
</html>`,
```

**Modification needed:** Add `<style>` block with `@media (prefers-color-scheme: dark)` inside `<head>` (D-15):
```html
<style>
  @media (prefers-color-scheme: dark) {
    body { background: #111827 !important; color: #f3f4f6 !important; }
    h1 { color: #6b7280 !important; }
    p { color: #9ca3af !important; }
    a { color: #60a5fa !important; }
  }
</style>
```

---

### `next.config.ts` (MODIFIED - config)

**Current CSP construction** (lines 5-8):
```typescript
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
```

**Modification needed:** Add SHA-256 hash of the FOWT prevention script to `script-src` in production:
```typescript
`script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : " 'sha256-<computed-hash>'"}`
```

The hash must be computed from the exact script string used in `theme-script.tsx`. The script content is static/deterministic, so the hash is a build-time constant.

---

### `tests/components/theme.test.ts` (NEW - test)

**Analog:** `tests/components/markdown-renderer.test.tsx` (lines 1-112)

**Test file structure pattern** (lines 1-9):
```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
// ... domain-specific imports ...

describe("MarkdownRenderer pipeline", () => {
  it("REND-01: renders GFM table with th and td elements", async () => {
    // ... test body ...
  });
});
```

Theme tests should follow the same structure. Note: theme toggle tests may need `@vitest-environment jsdom` since they test DOM manipulation (localStorage, classList).

**Test naming pattern:** `"REQ-ID: descriptive behavior"` (e.g., `"UI-04: reads theme from localStorage on mount"`).

---

### `tests/components/copy-button.test.ts` (NEW - test)

**Analog:** `tests/components/markdown-renderer.test.tsx` (same structure as above)

Copy button tests need `@vitest-environment jsdom` for `navigator.clipboard` mocking. Follow the same `describe`/`it` naming convention with `UI-03` requirement IDs.

---

### `tests/components/markdown-renderer.test.tsx` (MODIFIED - test)

**Current pipeline test** (lines 18-28):
```typescript
async function processMarkdown(input: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeShiki, { theme: "github-light" })
    .use(rehypeStringify)
    .process(input);
  return String(result);
}
```

**Modification needed:** Update the `rehypeShiki` config to match the new dual-theme config:
```typescript
.use(rehypeShiki, { themes: { light: "github-light", dark: "github-dark" }, defaultColor: "light" })
```

Add test asserting CSS variables are present in output:
```typescript
it("UI-04: renders dual-theme CSS variables for code blocks", async () => {
  const output = await processMarkdown("```js\nconst x = 1;\n```");
  expect(output).toContain("--shiki-dark");
});
```

---

### `tests/security/headers.test.ts` (MODIFIED - test)

**Current CSP test** (lines 104-121):
```typescript
describe("SECU-02: CSP and security headers configuration", () => {
  it("SECU-02: next.config.ts headers() returns Content-Security-Policy", async () => {
    const headersFn = nextConfig.headers;
    expect(headersFn).toBeDefined();

    const headerEntries = await headersFn!();
    const globalEntry = headerEntries.find(
      (entry) => entry.source === "/(.*)",
    );
    expect(globalEntry).toBeDefined();

    const cspHeader = globalEntry!.headers.find(
      (h) => h.key === "Content-Security-Policy",
    );
    expect(cspHeader).toBeDefined();
    expect(cspHeader!.value).toContain("default-src 'self'");
    expect(cspHeader!.value).toContain("script-src 'self'");
  });
```

**Modification needed:** Add assertion that CSP includes the FOWT script hash in production mode:
```typescript
it("UI-04: CSP script-src includes FOWT prevention script hash", async () => {
  // ... verify 'sha256-<hash>' is in script-src ...
});
```

---

## Shared Patterns

### Tab Toggle (Dark Mode Extension)

**Source:** `app/components/paste-form.tsx` lines 75-100 and `app/[slug]/components/paste-view.tsx` lines 16-41
**Apply to:** Both paste-form.tsx and paste-view.tsx

The identical tab toggle pattern appears in both files. Dark mode extension is the same for both:
```typescript
// Current inactive state:
"bg-white text-gray-600"
// Extended with dark variants:
"bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"

// Border container:
"border-gray-200"
// Extended:
"border-gray-200 dark:border-gray-700"
```

### Prose Container (Dark Mode Extension)

**Source:** `app/components/markdown-renderer.tsx` line 12 and `app/components/markdown-preview.tsx` line 14
**Apply to:** Both markdown-renderer.tsx and markdown-preview.tsx

Both share the identical prose class string:
```typescript
// Current:
"prose prose-gray max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-img:rounded-lg"
// Add:
"dark:prose-invert"
```

### Client Component Convention

**Source:** `app/components/draft-indicator.tsx` lines 1-2
**Apply to:** All new Client Components (theme-toggle.tsx, copy-button.tsx, copyable-pre.tsx)

```typescript
"use client";

import { useState, useEffect } from "react";
```

All Client Components in this project:
1. Start with `"use client";` directive
2. Use named exports (not default exports)
3. Define a TypeScript interface for props
4. Use Tailwind utility classes exclusively
5. Include `aria-label` on interactive elements

### Responsive Padding

**Source:** `app/page.tsx` line 5 and `app/[slug]/page.tsx` line 35
**Apply to:** Both page files

```typescript
// Current:
"mx-auto max-w-3xl p-8"
// Change to:
"mx-auto max-w-3xl p-4 sm:p-8"
```

### Test File Convention

**Source:** `tests/components/markdown-renderer.test.tsx` lines 1-3
**Apply to:** All new test files

```typescript
// @vitest-environment node  (or jsdom for DOM tests)
import { describe, it, expect } from "vitest";
```

Test IDs follow `"REQ-ID: behavior description"` pattern.

### Import Path Convention

**Source:** All component files
**Apply to:** All new files

```typescript
// Use @/ path alias for project imports
import { ThemeToggle } from "@/app/components/theme-toggle";
import { CopyButton } from "@/app/components/copy-button";
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/components/theme-script.tsx` | component | SSR inline script | No existing component uses `dangerouslySetInnerHTML` for inline scripts. Closest pattern is `layout.tsx` for Server Component structure. RESEARCH.md Pattern 2 provides the full implementation pattern. |

## Metadata

**Analog search scope:** `app/`, `tests/`, `next.config.ts`
**Files scanned:** 23
**Pattern extraction date:** 2026-05-14
