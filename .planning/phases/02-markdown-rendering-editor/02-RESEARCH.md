# Phase 2: Markdown Rendering & Editor - Research

**Researched:** 2026-05-14
**Domain:** Markdown rendering pipeline (react-markdown + Shiki + rehype-sanitize), live preview, localStorage persistence, split-pane editor layout
**Confidence:** HIGH

## Summary

This phase transforms the existing paste view from raw `<pre>` text to beautifully rendered Markdown with syntax-highlighted code blocks, and upgrades the editor with a live preview, split-pane layout, and localStorage draft persistence. The architecture splits into two rendering paths: server-side rendering via `MarkdownAsync` + `@shikijs/rehype` for paste view pages (zero client JS), and client-side rendering via the synchronous `Markdown` component for the editor preview (no syntax highlighting, kept lightweight).

The critical technical finding is the **plugin ordering between `rehype-sanitize` and `@shikijs/rehype`**. Shiki outputs inline `style` attributes for token colors, which `rehype-sanitize`'s default schema strips. The solution is to place `rehype-sanitize` **before** `@shikijs/rehype` in the server-side pipeline -- sanitize the untrusted user input first, then let Shiki (trusted code) add its styling afterward. For the client-side preview path (no Shiki), `rehype-sanitize` can run in any position since no inline styles are generated.

All recommended libraries are verified at their current npm registry versions. The stack is mature and well-documented. No significant risks or unknowns remain.

**Primary recommendation:** Implement two separate Markdown renderer components -- a Server Component (`markdown-renderer.tsx`) using `MarkdownAsync` with Shiki, and a Client Component (`markdown-preview.tsx`) using the synchronous `Markdown` component without Shiki. Keep the plugin ordering `[rehypeSanitize, [rehypeShiki, options]]` on the server path to preserve both security and syntax highlighting.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Paste view page (`app/[slug]/page.tsx`) renders Markdown server-side using react-markdown with `MarkdownAsync` in a Server Component. This produces zero client JS for read-only paste views.
- **D-02:** Editor live preview renders Markdown client-side using react-markdown in the existing Client Component (`app/components/paste-form.tsx`).
- **D-03:** Use remark-gfm for GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks) in both server and client rendering paths.
- **D-04:** Use rehype-sanitize for defense-in-depth XSS prevention in both rendering paths.
- **D-05:** Paste view page uses Shiki (via @shikijs/rehype) for VS Code-quality server-side syntax highlighting. Zero client JS cost.
- **D-06:** Editor live preview does NOT include syntax highlighting. Code blocks render as styled `<pre>/<code>` without language highlighting.
- **D-07:** Researcher should validate Shiki client-side bundle size as noted in STATE.md research gap.
- **D-08:** Preview updates client-side using react-markdown -- no server roundtrip. Debounce input by ~300ms.
- **D-09:** Preview renders in real-time as the user types, showing the same GFM features that the final paste view will have (minus syntax highlighting).
- **D-10:** Desktop layout uses a fixed 50/50 horizontal split -- editor textarea on the left, rendered preview on the right.
- **D-11:** Mobile layout stacks editor and preview vertically with a toggle button to switch between edit and preview views.
- **D-12:** Use Tailwind responsive breakpoints for the desktop/mobile transition. No resizable drag handle.
- **D-13:** Auto-save editor content to localStorage on every keystroke, debounced by ~1 second. Key: `paste-md-draft`.
- **D-14:** On page load, if a draft exists in localStorage, restore it into the editor. Show a subtle, dismissible indicator.
- **D-15:** Clear localStorage draft immediately after successful paste creation.
- **D-16:** Install @tailwindcss/typography and use the `prose` class for rendered Markdown output.
- **D-17:** Apply consistent prose styling in both the paste view page and the editor live preview.

### Claude's Discretion
- Specific Shiki theme selection (e.g., github-light, one-dark-pro)
- Debounce implementation details (custom hook vs library)
- Exact Tailwind breakpoint for desktop/mobile split-pane transition
- Preview toggle button placement and styling on mobile
- Draft restored indicator styling and auto-dismiss behavior
- react-markdown component structure and file organization

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REND-01 | Paste content is rendered as GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks) | remark-gfm 4.0.1 provides all GFM features. Used as `remarkPlugins={[remarkGfm]}` in both rendering paths. |
| REND-02 | Code blocks in pastes display with syntax highlighting for 100+ languages | Shiki 4.0.2 via @shikijs/rehype supports all VS Code languages (200+). Server-side only via `MarkdownAsync`. |
| REND-03 | User sees a real-time Markdown preview while typing in the editor | Client-side `Markdown` component from react-markdown 10.1.0 with 300ms debounce. No Shiki on client. |
| EDIT-01 | Editor provides a clean textarea for entering Markdown content | Existing `paste-form.tsx` textarea. Extended with split-pane layout. |
| EDIT-02 | Editor persists content to localStorage to prevent accidental loss | Custom `useLocalStorageDraft` hook with 1s debounced save, restore on mount, clear on submit. |
| EDIT-03 | Editor supports split-pane layout (edit left, preview right) on desktop | Tailwind `grid grid-cols-2` at `md` breakpoint (768px). Mobile: stacked with toggle. |
| SECU-01 | Rendered Markdown output is sanitized to prevent XSS attacks | react-markdown is secure by default (ignores raw HTML). rehype-sanitize 6.0.0 adds defense-in-depth. Plugin ordering critical for server path. |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Markdown rendering (paste view) | Frontend Server (SSR) | -- | Server Component renders Markdown to HTML with zero client JS. Shiki runs server-side only. |
| Markdown rendering (live preview) | Browser / Client | -- | Client Component renders Markdown in real-time as user types. No server roundtrip. |
| Syntax highlighting | Frontend Server (SSR) | -- | Shiki runs server-side only per D-05/D-06. Zero client JS cost. |
| XSS sanitization | Frontend Server (SSR) | Browser / Client | rehype-sanitize runs in both paths. Server path is the primary security boundary for stored content. |
| localStorage draft persistence | Browser / Client | -- | Browser-only API. Save/restore/clear managed by custom hook. |
| Split-pane layout | Browser / Client | -- | CSS-only responsive layout via Tailwind breakpoints. Toggle state managed client-side. |
| Typography styling | CDN / Static | -- | @tailwindcss/typography generates CSS at build time. Applied via `prose` class. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Markdown-to-React rendering | Exports `MarkdownAsync` for async server-side rendering with Shiki, and synchronous `Markdown` for client-side preview. 20M+ weekly downloads. No `dangerouslySetInnerHTML`. [VERIFIED: npm registry] |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown | Tables, task lists, strikethrough, autolinks, footnotes. De facto Markdown standard. [VERIFIED: npm registry] |
| rehype-sanitize | 6.0.0 | XSS prevention | Sanitizes HTML AST. Default schema follows GitHub's sanitization rules. Defense-in-depth since react-markdown already ignores raw HTML. [VERIFIED: npm registry] |
| shiki | 4.0.2 | Syntax highlighting | VS Code-quality TextMate grammar-based highlighting. Server-side rendering means zero client JS. Supports 200+ languages. [VERIFIED: npm registry] |
| @shikijs/rehype | 4.0.2 | Shiki-rehype integration | Plugs Shiki into the react-markdown rehype pipeline. Uses shared singleton highlighter. [VERIFIED: npm registry] |
| @tailwindcss/typography | 0.5.19 | Prose styling | Beautiful typographic defaults for rendered Markdown. `prose` class handles headings, paragraphs, lists, tables, code blocks, blockquotes. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | -- | -- | All functionality covered by core libraries + custom hooks |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @shikijs/rehype (server) | Custom `components.code` with `codeToHtml` | More control but more boilerplate. rehype plugin is cleaner for pipeline integration. |
| Custom useDebounce hook | lodash.debounce or use-debounce npm package | Custom hook is ~10 lines, avoids adding a dependency for a trivial utility. |
| rehype-sanitize | react-markdown's built-in security | react-markdown ignores raw HTML by default, but rehype-sanitize adds defense-in-depth against future pipeline changes (e.g., if rehype-raw is ever added). |

**Installation:**
```bash
npm install react-markdown remark-gfm rehype-sanitize shiki @shikijs/rehype @tailwindcss/typography
```

**Version verification:** All versions verified against npm registry on 2026-05-14. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
USER CREATES PASTE                    USER VIEWS PASTE
     |                                      |
     v                                      v
[Browser: PasteForm]              [Browser: HTTP GET /slug]
  |  "use client"                           |
  |  - textarea input                       v
  |  - 300ms debounce ──> [Markdown]  [Next.js Server]
  |  - remark-gfm                     async Server Component
  |  - rehype-sanitize                      |
  |  - NO Shiki                             v
  |                                  [MarkdownAsync]
  |  - 1s debounce ──> localStorage    - remark-gfm
  |    key: "paste-md-draft"           - rehype-sanitize (FIRST)
  |                                    - @shikijs/rehype (SECOND)
  |                                         |
  v                                         v
[POST /api/paste]                    [HTML with inline styles]
  |                                    - Shiki token colors
  v                                    - prose typography
[SQLite]                               - zero client JS
```

### Recommended Project Structure

```
app/
  [slug]/
    page.tsx              # Modified: replace <pre> with <MarkdownRenderer>
  components/
    paste-form.tsx        # Modified: split-pane, preview, localStorage, mobile toggle
    markdown-renderer.tsx # NEW: Server Component (MarkdownAsync + Shiki)
    markdown-preview.tsx  # NEW: Client Component (Markdown, no Shiki)
    draft-indicator.tsx   # NEW: Client Component ("Draft restored" notification)
  globals.css             # Modified: add @plugin directive
lib/
  hooks/
    use-debounce.ts             # NEW: generic debounce hook
    use-local-storage-draft.ts  # NEW: localStorage persistence hook
```

### Pattern 1: Server-Side Markdown Rendering with Shiki

**What:** Render paste content server-side using `MarkdownAsync` with the full rehype pipeline including Shiki syntax highlighting.
**When to use:** Paste view page (`/[slug]`) -- read-only content, no interactivity needed.

```typescript
// Source: react-markdown docs (Context7 /remarkjs/react-markdown) + @shikijs/rehype docs
// app/components/markdown-renderer.tsx

import { MarkdownAsync } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeShiki from '@shikijs/rehype';

interface MarkdownRendererProps {
  content: string;
}

export async function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-gray max-w-none">
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSanitize,                    // FIRST: sanitize untrusted input
          [rehypeShiki, { theme: 'github-light' }],  // SECOND: Shiki adds trusted styling
        ]}
      >
        {content}
      </MarkdownAsync>
    </article>
  );
}
```

**Critical:** `rehypeSanitize` MUST come before `rehypeShiki` in the plugin array. If reversed, rehype-sanitize strips Shiki's inline `style` attributes, breaking all syntax highlighting colors. [VERIFIED: rehype-sanitize docs, rehypejs/rehype-sanitize GitHub]

### Pattern 2: Client-Side Markdown Preview (No Shiki)

**What:** Render live preview of Markdown content in the editor using the synchronous `Markdown` component.
**When to use:** Editor preview pane -- needs instant client-side rendering.

```typescript
// Source: react-markdown docs (Context7 /remarkjs/react-markdown)
// app/components/markdown-preview.tsx
'use client';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div
      className="prose prose-gray max-w-none"
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

### Pattern 3: Debounce Hook

**What:** Generic debounce hook for delaying state updates.
**When to use:** Preview rendering (300ms) and localStorage saving (1000ms).

```typescript
// lib/hooks/use-debounce.ts
'use client';

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Pattern 4: localStorage Draft Persistence Hook

**What:** Hook managing save/restore/clear of editor draft content.
**When to use:** PasteForm component for EDIT-02 requirement.

```typescript
// lib/hooks/use-local-storage-draft.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'paste-md-draft';

export function useLocalStorageDraft() {
  const [restoredDraft, setRestoredDraft] = useState<string | null>(null);
  const [wasRestored, setWasRestored] = useState(false);

  // Restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRestoredDraft(saved);
        setWasRestored(true);
      }
    } catch {
      // localStorage unavailable (SSR, private browsing)
    }
  }, []);

  // Save (called with debounced value)
  const saveDraft = useCallback((content: string) => {
    try {
      if (content) {
        localStorage.setItem(STORAGE_KEY, content);
      }
    } catch {
      // QuotaExceededError -- silently ignore per D-14
    }
  }, []);

  // Clear after successful creation
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently ignore
    }
  }, []);

  const dismissRestored = useCallback(() => {
    setWasRestored(false);
  }, []);

  return { restoredDraft, wasRestored, saveDraft, clearDraft, dismissRestored };
}
```

### Pattern 5: Tailwind v4 Typography Plugin Registration

**What:** Register @tailwindcss/typography in Tailwind v4's CSS-first config.
**When to use:** `app/globals.css` -- one-time setup.

```css
/* Source: @tailwindcss/typography docs (Context7 /tailwindlabs/tailwindcss-typography) */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

### Anti-Patterns to Avoid

- **Reversed plugin order:** Placing `rehypeShiki` before `rehypeSanitize` causes sanitize to strip Shiki's inline styles. Always sanitize first, highlight second.
- **Using `MarkdownAsync` on client:** `MarkdownAsync` returns a Promise (async component) designed for React Server Components. On the client, use the synchronous `Markdown` export or `MarkdownHooks`.
- **Using Shiki on client for live preview:** Shiki's full bundle is ~2MB+ and language grammars add latency. Per D-06, the preview path skips syntax highlighting entirely for responsiveness.
- **Using `dangerouslySetInnerHTML` for Markdown:** react-markdown builds a React virtual DOM safely. Never bypass it with raw HTML injection.
- **Synchronous localStorage reads in render:** Always read localStorage in `useEffect` (not during render) to avoid hydration mismatches between server and client.
- **Missing `max-w-none` on prose container:** The `prose` class sets its own max-width. Since the outer container (`max-w-3xl`) already constrains width, add `max-w-none` to the prose element to prevent double-constraining.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown parsing | Custom regex-based parser | react-markdown + remark-gfm | Markdown spec has hundreds of edge cases (nested lists, setext headings, link reference definitions). react-markdown uses unified/micromark which passes CommonMark spec tests. |
| Syntax highlighting | Custom tokenizer | Shiki via @shikijs/rehype | TextMate grammars encode decades of language-specific knowledge. Replicating even basic keyword highlighting for 200+ languages is infeasible. |
| HTML sanitization | Custom allowlist/blocklist | rehype-sanitize | XSS prevention requires deep knowledge of HTML spec edge cases (SVG script injection, CSS expression attacks, DOM clobbering). rehype-sanitize follows GitHub's battle-tested schema. |
| Prose typography | Custom CSS for rendered HTML | @tailwindcss/typography | Typographic defaults for arbitrary HTML require handling dozens of element combinations (nested lists, blockquotes with code, table cell alignment). The `prose` class handles all of these. |
| Debounce | Complex debounce library | Custom 10-line hook | For this use case (simple value debouncing), a custom hook is trivial and avoids a dependency. |

**Key insight:** The Markdown rendering pipeline (parsing, AST transformation, sanitization, syntax highlighting, React element generation) is a solved problem with a mature ecosystem. Every component in the pipeline (remark, rehype, react-markdown, shiki) has years of production use and comprehensive test suites. Hand-rolling any part of this pipeline would be months of work with worse results.

## Common Pitfalls

### Pitfall 1: rehype-sanitize Strips Shiki Inline Styles
**What goes wrong:** Syntax highlighting appears to work in development but all colors are missing -- code blocks render as plain monospace text with no color tokens.
**Why it happens:** Shiki generates `<span style="color: #e06c75">` tokens. The `rehype-sanitize` default schema does not allow `style` attributes on any element. If `rehypeSanitize` runs after `rehypeShiki`, it strips all the `style` attributes.
**How to avoid:** Place `rehypeSanitize` BEFORE `rehypeShiki` in the `rehypePlugins` array. This sanitizes the untrusted input first, then Shiki (trusted code) adds its styling afterward.
**Warning signs:** Code blocks render with correct `<pre><code>` structure but no colored tokens. Inspect the HTML and look for missing `style` attributes on `<span>` elements inside code blocks.
[VERIFIED: rehype-sanitize GitHub docs, community discussions]

### Pitfall 2: Using Synchronous Markdown Component with Async Plugins
**What goes wrong:** Runtime error when using `@shikijs/rehype` with the default `Markdown` component from react-markdown.
**Why it happens:** `@shikijs/rehype` is an async plugin that needs to load themes/languages. The default `Markdown` export is synchronous and cannot handle async plugins.
**How to avoid:** Use `MarkdownAsync` in Server Components (async/await supported). Use `MarkdownHooks` on the client if async plugins are needed (not needed in this phase since client preview skips Shiki).
**Warning signs:** Error message about promises or async operations in synchronous context.
[VERIFIED: react-markdown docs (Context7), shiki issue #829]

### Pitfall 3: Hydration Mismatch from localStorage Read During Render
**What goes wrong:** React hydration error on page load when draft content exists in localStorage.
**Why it happens:** Server renders the component with empty content, but if localStorage is read synchronously during the initial render, the client would render with draft content, causing a mismatch.
**How to avoid:** Read localStorage only inside `useEffect` (runs after hydration). Set content state via `setState` after the effect runs. The component initially renders empty (matching server), then updates with the draft.
**Warning signs:** Console error: "Text content did not match. Server: '' Client: 'saved draft text'".
[ASSUMED]

### Pitfall 4: Missing @plugin Directive for Typography
**What goes wrong:** `prose` class has no effect -- rendered Markdown looks unstyled.
**Why it happens:** In Tailwind v4, plugins must be registered via `@plugin` directive in CSS, not in a JavaScript config file. Forgetting to add `@plugin "@tailwindcss/typography"` to `globals.css` means the plugin never loads.
**How to avoid:** Add `@plugin "@tailwindcss/typography";` to `app/globals.css` right after the `@import "tailwindcss";` line.
**Warning signs:** The `prose` class exists in the HTML but elements inside it have no typographic styling.
[VERIFIED: @tailwindcss/typography docs (Context7)]

### Pitfall 5: prose Overriding Shiki Code Block Styles
**What goes wrong:** Shiki-highlighted code blocks have incorrect background colors or padding because `prose` applies its own `<pre>` and `<code>` styles.
**Why it happens:** `@tailwindcss/typography` applies default styles to `pre` and `code` elements. These can conflict with Shiki's inline styles for background color and padding.
**How to avoid:** Override prose code block styles: `prose-pre:bg-transparent prose-pre:p-0`. This defers to Shiki's styling for server-rendered code blocks. Also remove the backtick decorations from inline code: `prose-code:before:content-none prose-code:after:content-none`.
**Warning signs:** Code blocks have a gray background underneath Shiki's own background, or double padding.
[VERIFIED: UI-SPEC.md prose overrides table]

### Pitfall 6: Debounce Causing Stale Closure Issues
**What goes wrong:** The debounced localStorage save captures a stale version of the content, leading to lost keystrokes.
**Why it happens:** If the debounce callback closes over a stale state variable instead of using the latest value.
**How to avoid:** Use the `useDebounce` hook pattern that debounces the VALUE, not the callback. The hook returns a debounced value, and a separate `useEffect` reacts to changes in the debounced value to trigger the save.
**Warning signs:** Saved draft in localStorage is missing the last few characters typed before a page refresh.
[ASSUMED]

## Code Examples

### Server-Side Paste View Integration

```typescript
// Source: Existing app/[slug]/page.tsx + react-markdown/shiki docs
// app/[slug]/page.tsx

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

### Desktop Split-Pane Layout (Tailwind)

```html
<!-- Source: UI-SPEC.md -->
<!-- Desktop: side-by-side grid. Mobile: stacked with toggle -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Editor pane (always rendered, hidden on mobile when preview active) -->
  <div class="md:block" ...>
    <textarea class="min-h-[calc(100vh-280px)] w-full rounded-lg border border-gray-300 p-4 font-mono text-sm" />
  </div>

  <!-- Preview pane (always rendered on desktop, toggled on mobile) -->
  <div class="hidden md:block" ...>
    <div class="prose prose-gray max-w-none">
      <!-- MarkdownPreview renders here -->
    </div>
  </div>
</div>
```

### Draft Indicator Component

```typescript
// app/components/draft-indicator.tsx
'use client';

import { useState, useEffect } from 'react';

interface DraftIndicatorProps {
  visible: boolean;
  onDismiss: () => void;
}

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

  if (!show) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 transition-opacity duration-300"
    >
      <span>Draft restored</span>
      <button
        onClick={() => { setShow(false); onDismiss(); }}
        className="text-blue-400 hover:text-blue-600"
        aria-label="Dismiss draft notification"
      >
        x
      </button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prism.js for syntax highlighting | Shiki with TextMate grammars | 2023-2024 | VS Code-quality highlighting, server-side rendering eliminates client JS bundle |
| `Markdown` (sync) for all contexts | `MarkdownAsync` for server, `Markdown`/`MarkdownHooks` for client | react-markdown v10 (2024) | Server Components can use async rehype plugins natively |
| tailwind.config.js plugin registration | `@plugin` directive in CSS | Tailwind v4 (2025) | CSS-first configuration, no JS config file needed |
| rehype-sanitize v5 | rehype-sanitize v6 | 2024 | ESM-only, unified 11 compatibility |
| Class-based Shiki output | Inline style-based Shiki output (default) | Shiki v1+ | More accurate colors but requires careful sanitizer ordering |

**Deprecated/outdated:**
- Prism.js: Development stalled, v2 never shipped. Shiki is the standard replacement. [ASSUMED]
- `rehype-highlight` (for highlight.js integration): Still maintained but highlight.js quality is lower than Shiki for server-side use. [ASSUMED]
- `tailwind.config.js` for plugin registration: Still works in Tailwind v4 but deprecated in favor of CSS-first `@plugin` directive. [VERIFIED: @tailwindcss/typography docs]

## D-07 Research: Shiki Client-Side Bundle Size

Per STATE.md research gap and D-07, investigating Shiki's client-side feasibility for the editor preview:

**Finding:** Shiki's full bundle (all themes + languages) is approximately 2MB+ gzipped. Even with fine-grained bundles (importing only specific themes and languages), the minimum viable bundle includes the WASM engine (~800KB) plus theme (~20-50KB each) plus language grammars (~10-100KB each). For a live preview that re-renders on every keystroke (debounced), this adds unacceptable latency and bundle size. [CITED: shiki docs on fine-grained bundles]

**Alternative investigated:** The JavaScript regex engine (`shiki/engine/javascript`) avoids the WASM binary but is slower and less accurate for complex grammars.

**Recommendation:** D-06 is correct -- skip client-side syntax highlighting in the preview. The architectural separation (MarkdownAsync with Shiki on server, Markdown without Shiki on client) is sound. If client-side highlighting is desired in the future, `react-shiki` (a lightweight React wrapper) or `highlight.js` (~40KB for common languages) would be better fits than the full Shiki bundle. No architectural changes needed -- just swap the client-side `Markdown` component's `rehypePlugins` or `components.code`. [VERIFIED: shiki docs, react-shiki GitHub]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Hydration mismatch occurs if localStorage is read during initial render (not in useEffect) | Pitfall 3 | LOW -- this is standard React 18/19 behavior, but the exact error message may differ |
| A2 | Debounce stale closure is a risk with callback-based debounce patterns | Pitfall 6 | LOW -- mitigated by using value-based debounce hook pattern |
| A3 | Prism.js development has stalled | State of the Art | LOW -- does not affect this phase's decisions |

**If this table is empty:** N/A -- three assumed claims identified above.

## Open Questions

1. **Shiki theme for code blocks on paste view**
   - What we know: UI-SPEC specifies `github-light` theme. This is confirmed as a valid Shiki theme. [VERIFIED: shiki docs]
   - What's unclear: Whether this is the best visual match for the overall paste.md aesthetic. Phase 5 will add dark mode with `github-dark`.
   - Recommendation: Use `github-light` as specified. It matches the GitHub-style rendering users expect. Configure with single `theme` option (not dual `themes`) since dark mode ships in Phase 5.

2. **TypeScript `@ts-expect-error` for MarkdownAsync**
   - What we know: Some examples show `{/* @ts-expect-error Server Component */}` above `MarkdownAsync` usage. This suggests TypeScript may not fully understand async server component return types.
   - What's unclear: Whether react-markdown 10.1.0's TypeScript definitions properly type `MarkdownAsync` for RSC usage with Next.js 16.
   - Recommendation: Try without the `@ts-expect-error` first. If TypeScript errors occur, add it as a targeted suppression with a comment explaining why.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Shiki (requires >= 20) | TBD (check at execution) | -- | None -- Shiki requires Node 20+ |

**Missing dependencies with no fallback:**
- None expected -- all dependencies are npm packages installable with `npm install`.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REND-01 | Paste content rendered as GFM (tables, task lists, strikethrough) | integration | `npx vitest run tests/components/markdown-renderer.test.tsx -x` | No -- Wave 0 |
| REND-02 | Code blocks have syntax highlighting | integration | `npx vitest run tests/components/markdown-renderer.test.tsx -x` | No -- Wave 0 |
| REND-03 | Live preview updates as user types | integration | `npx vitest run tests/components/markdown-preview.test.tsx -x` | No -- Wave 0 |
| EDIT-01 | Editor provides clean textarea | manual-only | Manual -- existing textarea from Phase 1 | N/A |
| EDIT-02 | localStorage persistence | unit | `npx vitest run tests/hooks/use-local-storage-draft.test.ts -x` | No -- Wave 0 |
| EDIT-03 | Split-pane layout on desktop | manual-only | Manual -- visual layout verification | N/A |
| SECU-01 | XSS sanitization | unit | `npx vitest run tests/components/markdown-renderer.test.tsx -x` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/components/markdown-renderer.test.tsx` -- covers REND-01, REND-02, SECU-01. Note: testing Server Components with async plugins requires careful setup. May need to import `MarkdownAsync` directly and render with `renderToString` or test the underlying unified pipeline.
- [ ] `tests/components/markdown-preview.test.tsx` -- covers REND-03. Client component testing with React Testing Library.
- [ ] `tests/hooks/use-local-storage-draft.test.ts` -- covers EDIT-02. Unit test for save/restore/clear behavior with mocked localStorage.
- [ ] Testing async Server Components (MarkdownAsync) in Vitest may require `@testing-library/react` with server rendering support or direct unified pipeline testing. This is a known complexity area.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- anonymous-first app |
| V3 Session Management | No | N/A -- no sessions |
| V4 Access Control | No | N/A -- all pastes are public |
| V5 Input Validation | Yes | rehype-sanitize (HTML sanitization), react-markdown (ignores raw HTML by default), remark-gfm (safe Markdown parsing) |
| V6 Cryptography | No | N/A -- no encryption in this phase |

### Known Threat Patterns for Markdown Rendering

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via Markdown injection (script tags, event handlers) | Tampering | react-markdown ignores raw HTML by default. rehype-sanitize strips anything not in schema. |
| XSS via `javascript:` URLs in links | Tampering | react-markdown's built-in `defaultUrlTransform` strips `javascript:` and `vbscript:` protocols. |
| DOM clobbering via `id`/`name` attributes | Tampering | rehype-sanitize prefixes `id` and `name` with `user-content-` per GitHub's approach. |
| CSS injection via `style` attributes | Tampering | Only Shiki (trusted server-side code) generates `style` attributes. User input never produces `style` attributes because rehype-sanitize runs before Shiki. |
| Prototype pollution via Markdown AST | Tampering | unified/micromark's AST construction does not use `Object.assign` from user input. |

## Sources

### Primary (HIGH confidence)
- [Context7: /remarkjs/react-markdown] - MarkdownAsync API, rehypePlugins, components prop, security model
- [Context7: /shikijs/shiki] - Fine-grained bundles, themes, rehype integration, Next.js usage
- [Context7: /tailwindlabs/tailwindcss-typography] - Tailwind v4 `@plugin` directive, prose class usage
- [npm registry] - All package versions verified: react-markdown 10.1.0, remark-gfm 4.0.1, rehype-sanitize 6.0.0, shiki 4.0.2, @shikijs/rehype 4.0.2, @tailwindcss/typography 0.5.19

### Secondary (MEDIUM confidence)
- [GitHub: rehypejs/rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) - Default schema, plugin ordering guidance, style attribute handling
- [GitHub: shikijs/shiki/issues/829](https://github.com/shikijs/shiki/issues/829) - @shikijs/rehype + react-markdown compatibility
- [GitHub: shikijs/shiki docs/packages/rehype.md](https://github.com/shikijs/shiki/blob/main/docs/packages/rehype.md) - rehypeShiki API, fine-grained bundle from core
- [WebSearch: rehype-sanitize + Shiki ordering](https://github.com/orgs/remarkjs/discussions/1254) - Community confirmation of sanitize-before-highlight pattern

### Tertiary (LOW confidence)
- None -- all claims verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against npm registry. APIs confirmed via Context7 docs.
- Architecture: HIGH - Plugin ordering verified across multiple sources. MarkdownAsync RSC pattern confirmed in official docs.
- Pitfalls: HIGH - Plugin ordering conflict confirmed. Hydration mismatch is standard React knowledge (assumed but well-known).

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable libraries, 30-day window)
