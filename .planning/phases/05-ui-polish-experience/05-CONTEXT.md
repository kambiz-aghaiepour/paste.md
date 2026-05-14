# Phase 5: UI Polish & Experience - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the existing interface production-quality across devices and lighting conditions. Four capabilities: (1) responsive mobile paste reading with proper code block overflow, (2) dark mode via system preference detection and manual toggle, (3) copy-to-clipboard buttons on code blocks, and (4) visual cleanup ensuring all components have dark mode variants. No new features, no new data flows, no authentication — just polish of what exists.

</domain>

<decisions>
## Implementation Decisions

### Dark Mode
- **D-01:** Use Tailwind's class-based dark mode strategy (not media-only). The `<html>` element receives `class="dark"` — this supports both system preference detection AND a manual toggle. In Tailwind v4, configure via `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css` or equivalent.
- **D-02:** Persist theme preference in localStorage (key: `paste-md-theme`, values: `"light"`, `"dark"`, `"system"`). Default is `"system"` — follows `prefers-color-scheme`. Manual override takes precedence.
- **D-03:** Inject an inline `<script>` in `<head>` (via `layout.tsx`) that reads localStorage and applies the `dark` class before first paint. This prevents flash-of-wrong-theme (FOWT). The CSP already allows `'unsafe-inline'` for scripts in dev mode; for production, use SRI hash or nonce for this script.
- **D-04:** Use Shiki's multi-theme (dual theme) rendering: `themes: { light: "github-light", dark: "github-dark" }` via `@shikijs/rehype`. Shiki renders CSS variables for both themes server-side — the active theme is selected via CSS matching the `dark` class on `<html>`. Zero additional client JS for theme switching in code blocks.
- **D-05:** Add `dark:prose-invert` to all prose containers (`MarkdownRenderer`, `MarkdownPreview`) for automatic dark mode typography inversion.
- **D-06:** Add a theme toggle component (sun/moon icon button) in a minimal header bar. The header contains "paste.md" branding (link to home) on the left and the toggle on the right. This header appears on all pages via `layout.tsx`.

### Copy-to-Clipboard
- **D-07:** Override the `pre` element in react-markdown's `components` prop with a Client Component wrapper that positions a copy button in the top-right corner of each code block.
- **D-08:** The copy button uses `navigator.clipboard.writeText()` to copy the text content of the code block. Visual feedback: button text/icon changes to "Copied!" (or a checkmark) for ~2 seconds, then reverts.
- **D-09:** For the paste view page (Server Component rendering path): the `MarkdownRenderer` renders code blocks server-side with Shiki, then the `PasteView` Client Component wrapper handles copy button interactivity. This preserves the existing RSC pattern from Phase 2 D-01.
- **D-10:** For the editor preview (Client Component): the `MarkdownPreview` component can include the same `pre` override via the `components` prop. Copy in preview is nice-to-have — Claude's discretion on whether to include it.

### Mobile Responsiveness
- **D-11:** Code blocks use `overflow-x: auto` for horizontal scrolling on small screens. Code readability depends on preserved formatting — no line wrapping on code.
- **D-12:** Ensure all touch targets (buttons, tabs, links) meet minimum 44px size for mobile accessibility.
- **D-13:** The paste view page already uses `max-w-3xl p-8` — reduce padding on mobile (e.g., `p-4 sm:p-8`) to reclaim horizontal space for content.

### Visual Cleanup
- **D-14:** Audit all hardcoded light-mode colors and add `dark:` variants. Affected components: `paste-form.tsx` (borders, backgrounds, text, button colors), `paste-view.tsx` (tab bar, raw view background), `not-found.tsx` (text colors), `page.tsx` (heading), `draft-indicator.tsx`.
- **D-15:** The 410 expired page in `proxy.ts` uses inline HTML with hardcoded styles — add dark mode support via inline media query `@media (prefers-color-scheme: dark)` since this page is outside React's rendering.
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` -- Project vision, core value, constraints (especially "Simplicity" and "Accessibility")
- `.planning/REQUIREMENTS.md` -- Full requirements with REQ-IDs (UI-01, UI-02, UI-03, UI-04 for this phase)

### Prior Phases
- `.planning/phases/02-markdown-rendering-editor/02-CONTEXT.md` -- Rendering architecture D-01/D-02, Shiki theme D-05, prose styling D-16/D-17, split-pane D-10/D-11/D-12
- `.planning/phases/03-paste-lifecycle/03-CONTEXT.md` -- Rendered/raw toggle D-07/D-08/D-09
- `.planning/phases/04-security-hardening/04-CONTEXT.md` -- CSP policy D-01/D-02/D-03 (especially `'unsafe-inline'` for style-src, script-src restrictions)

### Technology Stack
- `CLAUDE.md` -- Technology stack recommendations with versions (Tailwind 4.3.x, @tailwindcss/typography 0.5.19, Shiki 4.0.2)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/markdown-renderer.tsx` -- Server Component with Shiki rendering. Needs dual theme config (D-04) and `dark:prose-invert` (D-05).
- `app/components/markdown-preview.tsx` -- Client Component for editor preview. Needs `dark:prose-invert` (D-05) and optional copy button (D-10).
- `app/components/paste-form.tsx` -- Client Component with edit/preview tabs, expiration selector. Needs dark mode color variants (D-14).
- `app/[slug]/components/paste-view.tsx` -- Client Component wrapping rendered/raw toggle. Needs dark mode variants and copy button integration (D-07/D-09).
- `app/layout.tsx` -- Root layout. Needs header with theme toggle (D-06), dark mode script injection (D-03).
- `app/globals.css` -- Tailwind imports. Needs dark mode variant configuration (D-01).
- `next.config.ts` -- CSP headers. May need adjustment for dark mode inline script (D-03).

### Established Patterns
- Server Components for data-fetching pages, Client Components for interactivity
- Tailwind utility classes exclusively (no CSS modules, no config file — Tailwind v4 CSS-first)
- `prose prose-gray max-w-none` with specific overrides for rendered Markdown
- Tab toggle pattern used in both `paste-form.tsx` (edit/preview) and `paste-view.tsx` (rendered/raw)
- `@/` path alias for imports

### Integration Points
- `app/layout.tsx` -- Add header component, dark mode script, `dark` class management
- `app/globals.css` -- Add dark mode custom variant, dark theme base styles
- `app/components/markdown-renderer.tsx` -- Switch from single Shiki theme to dual themes
- All components with hardcoded colors -- Add `dark:` variants
- `app/proxy.ts` -- Add dark mode styles to inline 410 page HTML

</code_context>

<specifics>
## Specific Ideas

- Shiki's multi-theme approach renders CSS variables server-side, meaning dark/light code highlighting switches via CSS class, not re-rendering — perfect for the existing RSC architecture
- The inline script for FOWT prevention is a common pattern (Next.js themes, next-themes library) but needs CSP consideration since Phase 4 locked script-src to `'self'` in production
- The `proxy.ts` 410 page is outside React's rendering — use `@media (prefers-color-scheme: dark)` inline since it can't access the React theme context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 5-UI Polish & Experience*
*Context gathered: 2026-05-14*
