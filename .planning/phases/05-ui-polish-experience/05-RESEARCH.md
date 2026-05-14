# Phase 5: UI Polish & Experience - Research

**Researched:** 2026-05-14
**Domain:** UI theming, responsive design, clipboard API, Tailwind dark mode, Shiki dual-theme rendering
**Confidence:** HIGH

## Summary

Phase 5 polishes the existing interface for production readiness across devices and lighting conditions. The four capabilities -- clean minimal UI (UI-01), mobile responsiveness (UI-02), copy-to-clipboard on code blocks (UI-03), and dark mode with system preference detection plus manual toggle (UI-04) -- all build on the established Tailwind + react-markdown + Shiki stack without introducing new dependencies.

The technical approach is well-charted. Tailwind v4 introduces class-based dark mode via `@custom-variant dark (&:where(.dark, .dark *))` in CSS, replacing the old `tailwind.config.js` `darkMode: 'class'` approach. Shiki natively supports dual-theme rendering via CSS variables (`themes: { light: 'github-light', dark: 'github-dark' }` in `@shikijs/rehype` config), which switches themes via CSS class matching without re-rendering. The `@tailwindcss/typography` plugin ships with `prose-invert` for dark mode typography inversion. Copy-to-clipboard uses `navigator.clipboard.writeText()` (supported in all modern browsers since 2020) via a `pre` component override in react-markdown.

**Primary recommendation:** Implement dark mode infrastructure first (Tailwind custom variant, theme toggle, FOWT prevention script, Shiki dual themes) as it touches the most files, then layer copy-to-clipboard and responsive adjustments on top.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use Tailwind's class-based dark mode strategy (not media-only). The `<html>` element receives `class="dark"` -- this supports both system preference detection AND a manual toggle. In Tailwind v4, configure via `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css` or equivalent.
- **D-02:** Persist theme preference in localStorage (key: `paste-md-theme`, values: `"light"`, `"dark"`, `"system"`). Default is `"system"` -- follows `prefers-color-scheme`. Manual override takes precedence.
- **D-03:** Inject an inline `<script>` in `<head>` (via `layout.tsx`) that reads localStorage and applies the `dark` class before first paint. This prevents flash-of-wrong-theme (FOWT). The CSP already allows `'unsafe-inline'` for scripts in dev mode; for production, use SRI hash or nonce for this script.
- **D-04:** Use Shiki's multi-theme (dual theme) rendering: `themes: { light: "github-light", dark: "github-dark" }` via `@shikijs/rehype`. Shiki renders CSS variables for both themes server-side -- the active theme is selected via CSS matching the `dark` class on `<html>`. Zero additional client JS for theme switching in code blocks.
- **D-05:** Add `dark:prose-invert` to all prose containers (`MarkdownRenderer`, `MarkdownPreview`) for automatic dark mode typography inversion.
- **D-06:** Add a theme toggle component (sun/moon icon button) in a minimal header bar. The header contains "paste.md" branding (link to home) on the left and the toggle on the right. This header appears on all pages via `layout.tsx`.
- **D-07:** Override the `pre` element in react-markdown's `components` prop with a Client Component wrapper that positions a copy button in the top-right corner of each code block.
- **D-08:** The copy button uses `navigator.clipboard.writeText()` to copy the text content of the code block. Visual feedback: button text/icon changes to "Copied!" (or a checkmark) for ~2 seconds, then reverts.
- **D-09:** For the paste view page (Server Component rendering path): the `MarkdownRenderer` renders code blocks server-side with Shiki, then the `PasteView` Client Component wrapper handles copy button interactivity. This preserves the existing RSC pattern from Phase 2 D-01.
- **D-10:** For the editor preview (Client Component): the `MarkdownPreview` component can include the same `pre` override via the `components` prop. Copy in preview is nice-to-have -- Claude's discretion on whether to include it.
- **D-11:** Code blocks use `overflow-x: auto` for horizontal scrolling on small screens. Code readability depends on preserved formatting -- no line wrapping on code.
- **D-12:** Ensure all touch targets (buttons, tabs, links) meet minimum 44px size for mobile accessibility.
- **D-13:** The paste view page already uses `max-w-3xl p-8` -- reduce padding on mobile (e.g., `p-4 sm:p-8`) to reclaim horizontal space for content.
- **D-14:** Audit all hardcoded light-mode colors and add `dark:` variants. Affected components: `paste-form.tsx` (borders, backgrounds, text, button colors), `paste-view.tsx` (tab bar, raw view background), `not-found.tsx` (text colors), `page.tsx` (heading), `draft-indicator.tsx`.
- **D-15:** The 410 expired page in `proxy.ts` uses inline HTML with hardcoded styles -- add dark mode support via inline media query `@media (prefers-color-scheme: dark)` since this page is outside React's rendering.
- **D-16:** Consistent color palette: blue-600 for primary actions (buttons, active tabs), gray scale for borders/backgrounds/text. Dark mode inverts to dark backgrounds with light text, preserving the blue accent.

### Claude's Discretion
- Exact sun/moon toggle icon implementation (inline SVG, heroicons, or emoji)
- Header height and styling details
- Copy button icon and positioning specifics
- Exact Tailwind breakpoint adjustments for mobile padding
- Whether to add subtle transitions/animations for theme switching
- Dark mode color values for each component (as long as they follow the gray/blue palette)
- Whether copy-to-clipboard is included in the editor preview (D-10)
- CSP adjustment approach for the dark mode inline script (nonce vs SRI hash)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Interface is clean, minimal, and ad-free | Color audit of all components (D-14, D-16), consistent palette, header bar with branding (D-06) |
| UI-02 | Paste reading experience is fully responsive on mobile devices | `overflow-x: auto` on code blocks (D-11), 44px touch targets (D-12), responsive padding (D-13) |
| UI-03 | Code blocks display a copy-to-clipboard button | `pre` component override (D-07), `navigator.clipboard.writeText()` (D-08), RSC integration (D-09) |
| UI-04 | Application supports dark mode (system preference + manual toggle) | Tailwind class-based dark mode (D-01), localStorage persistence (D-02), FOWT prevention (D-03), Shiki dual themes (D-04), prose-invert (D-05), theme toggle component (D-06) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **SOLID principles required** -- all new components must follow Single Responsibility (theme toggle, copy button, header are separate components), Open/Closed (extend existing components with dark: variants, not rewrite), Dependency Inversion (theme state management abstracted from toggle UI)
- **Simplicity constraint** -- minimal UI, no unnecessary features
- **Performance constraint** -- page load and rendering must feel instant (FOWT prevention script is critical)
- **Accessibility constraint** -- rendered output must be readable and accessible (44px touch targets, aria labels)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dark mode class toggling | Browser / Client | -- | `<html>` class manipulation is a DOM operation; must run before paint via inline script |
| Theme preference persistence | Browser / Client | -- | localStorage is browser-only storage |
| Theme toggle UI | Browser / Client | -- | Interactive button requires client-side event handling |
| Shiki dual-theme rendering | Frontend Server (SSR) | Browser / Client (CSS) | Shiki renders CSS variables server-side; CSS class switch activates the right theme client-side |
| Copy-to-clipboard | Browser / Client | -- | `navigator.clipboard` is a browser API; requires user activation |
| Mobile responsive layout | Browser / Client (CSS) | -- | Tailwind responsive utilities are CSS-only, resolved at render time |
| Dark mode for 410 page | Frontend Server (SSR) | -- | Inline HTML response from proxy.ts; uses CSS media query, no client JS |
| Prose typography inversion | Browser / Client (CSS) | -- | `dark:prose-invert` is a CSS class toggle, no JS needed |

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.3.0 | Utility-first CSS with dark: variant | [VERIFIED: npm registry] Already installed. CSS-first config, `@custom-variant` for class-based dark mode |
| @tailwindcss/typography | 0.5.19 | Prose styling with `prose-invert` | [VERIFIED: npm registry] Already installed. Ships with dark mode variant out of the box |
| shiki | 4.0.2 | Syntax highlighting with dual-theme CSS variables | [VERIFIED: npm registry] Already installed. `themes` option generates CSS variables for light/dark |
| @shikijs/rehype | 4.0.2 | Rehype plugin for Shiki in react-markdown pipeline | [VERIFIED: npm registry] Already installed. Accepts same `themes` object as `codeToHtml` |
| react-markdown | 10.1.0 | Markdown rendering with `components` prop for `pre` override | [VERIFIED: npm registry] Already installed. `components` prop enables copy button integration |

### Supporting (no new packages needed)

This phase requires zero new npm packages. All capabilities are implemented using:
- Tailwind CSS utility classes (dark: variant, responsive breakpoints)
- Browser APIs (`navigator.clipboard.writeText()`, `localStorage`, `matchMedia`)
- Existing react-markdown `components` prop
- Existing Shiki `themes` configuration option
- Inline SVG for icons (no icon library needed)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline SVG icons | heroicons or lucide-react | Adds a dependency for 2 icons (sun/moon, copy). Inline SVG keeps bundle at zero. Pragmatic for this scope. |
| Manual theme logic | next-themes | next-themes adds 3.5KB and handles edge cases (SSR, system detection, FOWT). But this project has simple needs (2 themes, localStorage) and the inline script pattern is straightforward. Avoid dependency. |
| `navigator.clipboard` | clipboard-polyfill | All target browsers support `navigator.clipboard` since 2020. No polyfill needed. |

**Installation:**
```bash
# No new packages needed. All dependencies are already installed.
```

## Architecture Patterns

### System Architecture Diagram

```
User Visit
    |
    v
[Browser: <head> inline script]
    |-- Read localStorage("paste-md-theme")
    |-- Read matchMedia("prefers-color-scheme: dark")
    |-- Set <html class="dark"> or remove it
    |
    v
[Next.js Server Component: layout.tsx]
    |-- Render header with theme toggle placeholder
    |-- Render page content
    |
    +---> [Paste View Path]
    |         |
    |         v
    |     [MarkdownRenderer (Server)]
    |         |-- rehypeShiki with themes: { light, dark }
    |         |-- Outputs <pre> with CSS variables for both themes
    |         v
    |     [PasteView (Client)]
    |         |-- Wraps rendered content
    |         |-- Copy button on <pre> elements (via DOM)
    |         |-- Dark: variants on tab bar
    |
    +---> [Editor Path]
              |
              v
          [PasteForm (Client)]
              |-- MarkdownPreview with components={{ pre: CopyableCode }}
              |-- Dark: variants on all form elements
              |
              v
          [Theme Toggle (Client)]
              |-- Reads/writes localStorage
              |-- Toggles .dark class on <html>
              |-- Cycles: system -> light -> dark -> system
```

### Recommended Project Structure

```
app/
  layout.tsx                    # Header + dark mode script injection
  globals.css                   # @custom-variant dark, Shiki dark theme CSS
  page.tsx                      # Home page (responsive padding)
  not-found.tsx                 # 404 page (dark mode colors)
  proxy.ts                      # 410 page (inline dark mode CSS)
  components/
    header.tsx                  # NEW: Header bar with branding + theme toggle
    theme-toggle.tsx            # NEW: Client Component for dark mode toggle
    theme-script.tsx            # NEW: Inline script for FOWT prevention
    copy-button.tsx             # NEW: Client Component for clipboard copy
    copyable-pre.tsx            # NEW: <pre> wrapper with copy button
    markdown-renderer.tsx       # MODIFIED: dual themes, dark:prose-invert
    markdown-preview.tsx        # MODIFIED: dark:prose-invert, optional copy
    paste-form.tsx              # MODIFIED: dark: variants on all elements
    draft-indicator.tsx         # MODIFIED: dark: variants
  [slug]/
    components/
      paste-view.tsx            # MODIFIED: dark: variants, copy integration
    page.tsx                    # MODIFIED: responsive padding
```

### Pattern 1: Tailwind v4 Class-Based Dark Mode

**What:** Configure dark mode to use a CSS class on `<html>` rather than the `prefers-color-scheme` media query, enabling both system detection and manual override.
**When to use:** Any time you need a manual dark mode toggle alongside system preference detection.

```css
/* globals.css */
/* Source: https://tailwindcss.com/docs/dark-mode */
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:where(.dark, .dark *));
```

[VERIFIED: tailwindcss.com/docs/dark-mode] -- Tailwind v4 uses `@custom-variant` directive in CSS instead of JavaScript config.

### Pattern 2: FOWT Prevention Inline Script

**What:** A blocking inline script in `<head>` that reads localStorage and applies the `dark` class before the browser paints, preventing a flash of the wrong theme.
**When to use:** Any SSR/SSG app with class-based dark mode and localStorage persistence.

```typescript
// theme-script.tsx
// Source: https://tailwindcss.com/docs/dark-mode (three-way toggle pattern)
const THEME_SCRIPT = `
(function(){
  try {
    var theme = localStorage.getItem('paste-md-theme');
    var dark = theme === 'dark' ||
      (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch(e) {}
})();
`;

export function ThemeScript() {
  return (
    <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
  );
}
```

[CITED: tailwindcss.com/docs/dark-mode] -- The three-way toggle pattern (light/dark/system) is documented by Tailwind as the standard approach.

### Pattern 3: Shiki Dual-Theme with CSS Variables

**What:** Render code blocks with CSS variables for both light and dark themes, switching via CSS class.
**When to use:** Server-rendered syntax highlighting that must support dark mode without re-rendering.

```typescript
// markdown-renderer.tsx (modified rehype plugin config)
// Source: https://shiki.style/guide/dual-themes
rehypePlugins={[
  rehypeSanitize,
  [rehypeShiki, {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    defaultColor: 'light',
  }],
]}
```

```css
/* globals.css -- Shiki dark theme activation */
/* Source: https://shiki.style/guide/dual-themes */
html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

[VERIFIED: Context7 /shikijs/shiki and shiki.style/guide/dual-themes] -- Dual theme via `themes` object generates CSS variables. Class-based selector targets `html.dark .shiki`.

### Pattern 4: Copy Button via `pre` Component Override

**What:** Override the `pre` element in react-markdown's `components` prop to wrap code blocks with a copy button.
**When to use:** Adding interactive behavior to rendered markdown code blocks.

```typescript
// copyable-pre.tsx (Client Component)
"use client";
import { useState, useRef } from "react";

interface CopyablePreProps {
  children: React.ReactNode;
  [key: string]: unknown;
}

export function CopyablePre({ children, ...props }: CopyablePreProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    const text = preRef.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: clipboard API requires secure context
    }
  };

  return (
    <div className="relative group">
      <pre ref={preRef} {...props}>
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 ..."
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
```

[VERIFIED: Context7 /remarkjs/react-markdown] -- `components` prop maps HTML tag names to custom React components. The `pre` key targets code blocks.

### Pattern 5: Theme Toggle with localStorage

**What:** A client component that cycles between system/light/dark preferences and persists the choice.
**When to use:** Dark mode toggle with system preference respect.

```typescript
// theme-toggle.tsx (Client Component)
"use client";
import { useState, useEffect } from "react";

type Theme = "system" | "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("paste-md-theme") as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("paste-md-theme", newTheme);
    const isDark = newTheme === "dark" ||
      (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  };

  const cycle = () => {
    const next: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
    applyTheme(next[theme]);
  };

  return (
    <button onClick={cycle} aria-label={`Current theme: ${theme}`}>
      {/* Sun/Moon icon based on current state */}
    </button>
  );
}
```

### Anti-Patterns to Avoid

- **Media-only dark mode without class toggle:** Using only `prefers-color-scheme` media queries prevents manual override. The `@custom-variant` approach supports both. [CITED: tailwindcss.com/docs/dark-mode]
- **Re-rendering Shiki on theme change:** Shiki's CSS variable approach means theme switching is pure CSS -- never re-process markdown on theme change.
- **Using `document.execCommand("copy")` for clipboard:** Deprecated API. Use `navigator.clipboard.writeText()` which is supported in all modern browsers. [CITED: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText]
- **Wrapping `<pre>` override in a Server Component:** The copy button requires client-side event handlers. The `pre` override component must be a Client Component (`"use client"`).
- **Flash of wrong theme:** Without the inline `<head>` script, SSR pages render with the default theme and flash before client JS applies the user's preference.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode CSS variable management | Custom CSS variable system for theming | Tailwind `dark:` variant + `@custom-variant` | Tailwind handles thousands of dark mode utilities automatically |
| Prose dark mode styling | Custom CSS for each typography element | `dark:prose-invert` from @tailwindcss/typography | The plugin ships with hand-designed dark mode for every prose element |
| Code block theme switching | Custom JS to re-highlight on theme change | Shiki `themes` option with CSS variables | Zero-JS theme switching via CSS class selector |
| Clipboard copy with fallback | Custom clipboard abstraction with polyfills | `navigator.clipboard.writeText()` directly | 96%+ global browser support, requires HTTPS which the app uses |

**Key insight:** This phase is almost entirely CSS-driven. Dark mode is Tailwind classes, code theme switching is CSS variables, responsive layout is CSS breakpoints. The only client JS needed is: (1) theme toggle button handler, (2) FOWT prevention script, (3) copy button click handler.

## Common Pitfalls

### Pitfall 1: Flash of Wrong Theme (FOWT)
**What goes wrong:** The page renders with the wrong theme for a split second before client JS applies the user's preference from localStorage.
**Why it happens:** Next.js SSR sends HTML before client JS hydrates. Without a blocking script, the browser paints the default theme first.
**How to avoid:** Inject a synchronous `<script>` in `<head>` (before `<body>`) that reads localStorage and sets the `dark` class on `<html>`. This script must be blocking (not `async`/`defer`).
**Warning signs:** Visible flash on page load, especially noticeable when the user has dark mode preference but the page renders light first.

### Pitfall 2: CSP Blocking the Dark Mode Inline Script
**What goes wrong:** The inline `<script>` for FOWT prevention is blocked by the Content Security Policy, which currently restricts `script-src` to `'self'` in production.
**Why it happens:** The project's `next.config.ts` only allows `'unsafe-inline'` for scripts in dev mode. The FOWT prevention script is an inline script.
**How to avoid:** Compute the SHA-256 hash of the static script content at build time and add `'sha256-<hash>'` to the `script-src` CSP directive. The script content is deterministic (never changes per request), so a static hash works. Alternatively, the existing `experimental.sri` config may help, but SRI applies to external scripts, not inline scripts.
**Warning signs:** Console errors about CSP violations, dark mode script not executing in production.

### Pitfall 3: Shiki defaultColor Mismatch
**What goes wrong:** When switching from single `theme` to dual `themes` in `@shikijs/rehype`, the rendered code blocks might show no colors or double colors.
**Why it happens:** The `defaultColor` option controls which theme's colors appear as inline `style` attributes (the "default" state) vs. CSS variables. If not set, Shiki may not render inline styles for the light theme.
**How to avoid:** Set `defaultColor: 'light'` explicitly. This ensures the light theme colors are inline (visible by default) and dark theme colors are in CSS variables (activated by `.dark` class).
**Warning signs:** Code blocks appear unstyled, or both light and dark colors show simultaneously.

### Pitfall 4: Copy Button Extracting Wrong Text from Shiki Output
**What goes wrong:** `preRef.current?.textContent` might include extra whitespace or miss content because Shiki wraps tokens in multiple nested `<span>` elements.
**Why it happens:** Shiki generates `<pre><code><span>...</span></code></pre>` with many nested spans. Using `innerHTML` would include HTML tags; `innerText` might miss hidden elements.
**How to avoid:** Use `textContent` on the `<pre>` element, which concatenates all text nodes regardless of nesting. Trim trailing newlines. Test with multi-line code blocks containing special characters.
**Warning signs:** Copied code has extra spaces, missing content, or HTML tags.

### Pitfall 5: Dark Mode Transition Flash on Interactive Elements
**What goes wrong:** When toggling dark mode, interactive elements (buttons, tabs) flash briefly because Tailwind's JIT generates classes that apply instantly.
**Why it happens:** No CSS transition is applied to background-color and color changes.
**How to avoid:** Add `transition-colors duration-200` to elements that change color on theme switch. Keep this subtle -- the goal is smooth, not slow.
**Warning signs:** Jarring color jumps when clicking the theme toggle.

### Pitfall 6: prose-invert Not Cascading to Shiki Code Blocks
**What goes wrong:** `dark:prose-invert` inverts typography colors but Shiki code blocks keep their light theme colors.
**Why it happens:** Shiki's inline styles have higher specificity than prose-invert's CSS. Shiki code blocks use their own color system (CSS variables), not prose colors.
**How to avoid:** This is actually correct behavior -- Shiki's dual-theme CSS handles code block colors independently from prose-invert. But you must add the Shiki dark theme CSS selector (`html.dark .shiki, html.dark .shiki span`) to globals.css for it to work.
**Warning signs:** Code blocks stay light-themed when the rest of the page switches to dark.

### Pitfall 7: Mobile Touch Target Size
**What goes wrong:** Copy buttons and tab bar buttons are too small to tap accurately on mobile.
**Why it happens:** Buttons styled for desktop hover interaction are typically smaller than the 44x44px minimum recommended by WCAG and Apple HIG.
**How to avoid:** Ensure `min-h-[44px] min-w-[44px]` on all interactive elements, or use padding to achieve the minimum touch target area.
**Warning signs:** Users on mobile struggle to tap buttons, especially the copy button overlaid on code blocks.

## Code Examples

Verified patterns from official sources:

### Dark Mode CSS Configuration (globals.css)

```css
/* Source: https://tailwindcss.com/docs/dark-mode */
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:where(.dark, .dark *));

/* Source: https://shiki.style/guide/dual-themes */
/* Activate Shiki dark theme when html has .dark class */
html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

### Shiki Dual-Theme rehype Config

```typescript
// Source: https://shiki.style/packages/rehype
// In markdown-renderer.tsx
rehypePlugins={[
  rehypeSanitize,
  [rehypeShiki, {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    defaultColor: 'light',
  }],
]}
```

### Dark Mode Component Pattern (tab bar example)

```typescript
// Source: Existing paste-view.tsx pattern, extended with dark: variants
<button
  className={`flex-1 py-2 text-sm font-medium text-center min-h-[44px] transition-colors ${
    active
      ? "bg-blue-600 text-white"
      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
  }`}
>
```

### CSP Hash Generation for Inline Script

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
import crypto from "crypto";

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('paste-md-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();`;

const hash = crypto.createHash("sha256").update(THEME_SCRIPT).digest("base64");
// Add to CSP: script-src 'self' 'sha256-${hash}'
```

### Responsive Padding Pattern

```typescript
// Source: Tailwind responsive utility pattern
// Before: <main className="mx-auto max-w-3xl p-8">
// After:
<main className="mx-auto max-w-3xl p-4 sm:p-8">
```

### 410 Page Dark Mode (Outside React)

```html
<!-- Source: Inline HTML in proxy.ts, D-15 -->
<body style="margin:0;min-height:100vh;display:flex;...;background:#fff;color:#1f2937">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background: #111827 !important; color: #f3f4f6 !important; }
      h1 { color: #6b7280 !important; }
      p { color: #9ca3af !important; }
      a { color: #60a5fa !important; }
    }
  </style>
  ...
</body>
```

Note: The 410 page cannot use the class-based dark mode because it is outside React's rendering and has no access to the theme toggle state. It falls back to `prefers-color-scheme` media query, which is correct -- if a user manually selected a theme, their OS preference typically aligns anyway.

## Color Audit: Components Requiring Dark Mode Variants

All components with hardcoded light-mode colors, verified by codebase grep:

| Component | File | Light Colors Found | Dark Variants Needed |
|-----------|------|-------------------|---------------------|
| PasteForm | `app/components/paste-form.tsx` | `border-gray-200`, `bg-white`, `text-gray-600`, `border-gray-300`, `text-gray-500`, `bg-blue-600` | `dark:border-gray-700`, `dark:bg-gray-800`, `dark:text-gray-300`, `dark:border-gray-600`, `dark:text-gray-400` |
| PasteView | `app/[slug]/components/paste-view.tsx` | `border-gray-200`, `bg-white`, `text-gray-600`, `bg-gray-50` | `dark:border-gray-700`, `dark:bg-gray-800`, `dark:text-gray-300`, `dark:bg-gray-900` |
| DraftIndicator | `app/components/draft-indicator.tsx` | `border-blue-200`, `bg-blue-50`, `text-blue-700`, `text-blue-400` | `dark:border-blue-800`, `dark:bg-blue-950`, `dark:text-blue-300`, `dark:text-blue-500` |
| NotFound | `app/not-found.tsx` | `text-gray-400`, `text-gray-500`, `text-blue-600` | `dark:text-gray-500`, `dark:text-gray-400`, `dark:text-blue-400` |
| HomePage | `app/page.tsx` | (heading inherits body text) | Add `dark:text-white` to heading if needed |
| PastePage | `app/[slug]/page.tsx` | `text-gray-500` | `dark:text-gray-400` |
| MarkdownRenderer | `app/components/markdown-renderer.tsx` | `prose-gray`, `prose-a:text-blue-600` | Add `dark:prose-invert` |
| MarkdownPreview | `app/components/markdown-preview.tsx` | `prose-gray`, `prose-a:text-blue-600` | Add `dark:prose-invert` |
| RootLayout body | `app/layout.tsx` | `antialiased` (no explicit bg/text) | Add `bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100` |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` `darkMode: 'class'` | `@custom-variant dark (...)` in CSS | Tailwind v4 (Jan 2025) | No JavaScript config file needed; CSS-native |
| Shiki single `theme` option | Shiki `themes` object with CSS variables | Shiki v1.0+ (2024) | Zero-JS theme switching for code blocks |
| `document.execCommand("copy")` | `navigator.clipboard.writeText()` | Chrome 66+ / Firefox 63+ (2018-2020) | Async, promise-based, secure context required |
| next-themes library for dark mode | Manual inline script + localStorage | Always viable | Fewer dependencies for simple 2-theme use case |

**Deprecated/outdated:**
- `darkMode: 'class'` in tailwind.config.js -- replaced by `@custom-variant dark` in Tailwind v4 [VERIFIED: tailwindcss.com/docs/dark-mode]
- `document.execCommand("copy")` -- deprecated, replaced by Clipboard API [CITED: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The existing `experimental.sri` config in `next.config.ts` applies only to external scripts (not inline), so the FOWT script needs a manual SHA-256 hash in CSP | CSP Pitfall 2 | If SRI does cover inline scripts, the manual hash step is unnecessary but harmless |
| A2 | `preRef.current?.textContent` correctly extracts code text from Shiki's nested span output | Pattern 4 / Pitfall 4 | If Shiki output structure differs, the copy button might extract wrong text; needs testing |
| A3 | The `defaultColor: 'light'` option in `@shikijs/rehype` causes Shiki to render inline light theme styles and CSS variables for dark theme | Shiki Dual Theme | If defaultColor behavior differs in rehype plugin vs codeToHtml, code blocks may render incorrectly |

## Open Questions (RESOLVED)

1. **CSP Hash vs Nonce for FOWT Script** — RESOLVED: Use SHA-256 hash approach
   - The script content is deterministic — compute hash once, add to CSP `script-src`. This preserves static optimization and avoids middleware complexity. Fallback: allow `'unsafe-inline'` for `script-src` in production if hash proves problematic.

2. **Copy Button on Server-Rendered Paste View** — RESOLVED: Use client-side DOM approach in PasteView
   - `MarkdownRenderer` is a Server Component; passing Client Component overrides via `components` prop crosses RSC boundaries. The planner chose approach (2): client-side DOM approach in `PasteView` that queries `pre` elements and injects copy buttons after hydration. This keeps the RSC rendering path clean.

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
| UI-01 | Clean minimal interface with consistent dark mode colors | manual-only | Visual inspection | N/A |
| UI-02 | Mobile responsive -- code blocks scroll horizontally, text reflows | manual-only | Visual inspection at mobile viewport | N/A |
| UI-03 | Copy button on code blocks, copies text content | unit | `npx vitest run tests/components/copy-button.test.ts -x` | Wave 0 |
| UI-04 | Dark mode toggle, system preference detection, localStorage persistence | unit | `npx vitest run tests/components/theme.test.ts -x` | Wave 0 |
| UI-04 | Shiki dual-theme CSS variables in rendered output | unit | `npx vitest run tests/components/markdown-renderer.test.tsx -x` | Existing (modify) |
| UI-04 | CSP header includes FOWT script hash | unit | `npx vitest run tests/security/headers.test.ts -x` | Existing (modify) |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/components/theme.test.ts` -- covers UI-04 theme toggle logic (localStorage read/write, class toggling)
- [ ] `tests/components/copy-button.test.ts` -- covers UI-03 clipboard copy behavior
- [ ] Update `tests/components/markdown-renderer.test.tsx` -- verify dual-theme CSS variable output (UI-04)
- [ ] Update `tests/security/headers.test.ts` -- verify CSP includes FOWT script hash (UI-04)

Note: UI-01 (visual cleanliness) and UI-02 (mobile responsiveness) are inherently visual/manual-only requirements. They cannot be meaningfully unit-tested -- they require viewport testing (browser dev tools or real devices). The planner should include manual verification steps for these.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- anonymous-first |
| V3 Session Management | no | N/A -- no sessions |
| V4 Access Control | no | N/A -- public pastes |
| V5 Input Validation | no | No new user input in this phase |
| V6 Cryptography | no | SHA-256 for CSP hash only, not security-critical |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via inline script injection | Elevation of Privilege | CSP `script-src` with hash -- only the exact FOWT script is allowed |
| Clipboard API abuse | Information Disclosure | Requires user activation (click) -- browser enforces this |
| FOWT script reading arbitrary localStorage | Information Disclosure | Script reads only `paste-md-theme` key -- minimal data access |

**Key security consideration:** The FOWT prevention inline script is the only security-sensitive addition. It must be:
1. Minimal -- read one localStorage key, toggle one class
2. Static -- content never changes per request (enables hash-based CSP)
3. Error-handled -- wrapped in try/catch so localStorage failures don't break the page

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4 dark mode docs](https://tailwindcss.com/docs/dark-mode) -- `@custom-variant` syntax, three-way toggle pattern
- [Shiki dual themes guide](https://shiki.style/guide/dual-themes) -- CSS variables, `themes` object, `defaultColor` option
- [Shiki rehype plugin docs](https://shiki.style/packages/rehype) -- `themes` config in rehype plugin
- [Context7 /shikijs/shiki] -- dual theme CSS variable generation, class-based selector
- [Context7 /remarkjs/react-markdown] -- `components` prop for `pre`/`code` overrides
- [@tailwindcss/typography GitHub](https://github.com/tailwindlabs/tailwindcss-typography) -- `dark:prose-invert` usage
- [MDN Clipboard: writeText()](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) -- API reference, browser support, secure context requirement
- [Can I Use: clipboard.writeText](https://caniuse.com/mdn-api_clipboard_writetext) -- 96%+ global support

### Secondary (MEDIUM confidence)
- [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) -- nonce vs hash approaches, SRI experimental config
- [MDN Content-Security-Policy: script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src) -- SHA-256 hash syntax for inline scripts

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, versions verified against npm registry
- Architecture: HIGH -- patterns verified against official docs (Tailwind, Shiki, react-markdown)
- Pitfalls: HIGH -- FOWT, CSP, and Shiki dual-theme patterns well-documented in official sources
- Copy-to-clipboard: HIGH -- `navigator.clipboard.writeText()` well-established API
- CSP hash approach: MEDIUM -- the inline script hash pattern is well-documented but integration with Next.js experimental SRI config needs validation

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable domain -- CSS/theming patterns change slowly)
