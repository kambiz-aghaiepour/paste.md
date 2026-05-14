---
phase: 05-ui-polish-experience
plan: 01
subsystem: ui-theming
tags: [dark-mode, theme-toggle, shiki-dual-theme, csp, fowt-prevention, responsive]
dependency_graph:
  requires: []
  provides:
    - dark-mode-infrastructure
    - theme-toggle-component
    - header-component
    - shiki-dual-themes
    - csp-fowt-script-hash
  affects:
    - app/globals.css
    - app/layout.tsx
    - app/page.tsx
    - app/not-found.tsx
    - app/proxy.ts
    - app/components/*
    - app/[slug]/*
    - next.config.ts
tech_stack:
  added: []
  patterns:
    - tailwind-v4-custom-dark-variant
    - shiki-dual-theme-css-variables
    - fowt-prevention-inline-script
    - csp-sha256-hash
key_files:
  created:
    - lib/theme-script-content.ts
    - app/components/theme-script.tsx
    - app/components/theme-toggle.tsx
    - app/components/header.tsx
  modified:
    - app/globals.css
    - app/layout.tsx
    - app/components/markdown-renderer.tsx
    - app/components/markdown-preview.tsx
    - next.config.ts
    - app/page.tsx
    - app/not-found.tsx
    - app/proxy.ts
    - app/components/paste-form.tsx
    - app/components/draft-indicator.tsx
    - app/[slug]/page.tsx
    - app/[slug]/components/paste-view.tsx
decisions:
  - Shared THEME_SCRIPT constant in lib/theme-script-content.ts for deterministic CSP hash computation across theme-script.tsx and next.config.ts
  - Inline SVG icons for theme toggle (monitor, sun, moon) to avoid adding an icon dependency
  - Class-based dark mode via @custom-variant for Tailwind v4 instead of media-only approach
metrics:
  duration: 4min
  completed: 2026-05-14
---

# Phase 5 Plan 1: Dark Mode & Visual Consistency Summary

Tailwind v4 class-based dark mode with FOWT prevention, Shiki dual-theme code highlighting, and dark variants on all components and pages.

## What Was Done

### Task 1: Dark mode infrastructure (7a059b0)

Built the complete theme system foundation:

- **globals.css**: Added `@custom-variant dark (&:where(.dark, .dark *))` for Tailwind v4 class-based dark mode. Added Shiki dark theme CSS rules targeting `html.dark .shiki` to activate `--shiki-dark` CSS variables.
- **lib/theme-script-content.ts**: Shared constant for the FOWT prevention script string, imported by both `theme-script.tsx` (rendering) and `next.config.ts` (SHA-256 hash computation).
- **theme-script.tsx**: Server Component rendering a blocking inline `<script>` that reads `localStorage("paste-md-theme")` and toggles the `dark` class on `<html>` before first paint.
- **theme-toggle.tsx**: Client Component cycling system/light/dark themes. Persists to localStorage, toggles `dark` class on `documentElement`. Renders monitor/sun/moon inline SVGs with 44px touch targets and focus-visible ring.
- **header.tsx**: Server Component with "paste.md" branding link and ThemeToggle, rendered on all pages via layout.tsx.
- **layout.tsx**: Added `suppressHydrationWarning` on `<html>`, `ThemeScript` in `<head>`, `Header` in `<body>`, dark mode body classes (`bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`).
- **markdown-renderer.tsx**: Switched Shiki from single `theme: "github-light"` to dual `themes: { light: "github-light", dark: "github-dark" }` with `defaultColor: "light"`. Added `dark:prose-invert`.
- **markdown-preview.tsx**: Added `dark:prose-invert` to prose container.
- **next.config.ts**: Imports THEME_SCRIPT, computes SHA-256 hash at build time, adds `'sha256-{hash}'` to CSP `script-src` in production mode.

### Task 2: Dark mode variants on all remaining components (2067c8d)

Applied dark variants, responsive padding, and touch targets across the entire app:

- **page.tsx**: Removed h1 branding (now in header), changed `p-8` to `p-4 sm:p-8`.
- **not-found.tsx**: Added `dark:text-gray-500`, `dark:text-gray-400`, `dark:text-blue-400`.
- **proxy.ts**: Added `<style>` block with `@media (prefers-color-scheme: dark)` to 410 inline HTML, plus explicit `background:#fff` for light mode baseline.
- **paste-form.tsx**: Added dark variants on borders (`dark:border-gray-600/700`), backgrounds (`dark:bg-gray-800`), text (`dark:text-gray-100/300/400`), error text (`dark:text-red-400`), select dropdown. Added `min-h-[44px]` and `transition-colors` on tab buttons.
- **draft-indicator.tsx**: Added `dark:border-blue-800`, `dark:bg-blue-950`, `dark:text-blue-300`, `dark:text-blue-500`, `dark:hover:text-blue-300`.
- **[slug]/page.tsx**: Changed `p-8` to `p-4 sm:p-8`, added `dark:text-gray-400` to metadata paragraphs.
- **[slug]/components/paste-view.tsx**: Added dark variants on tab container, inactive tabs, raw view pre (`dark:bg-gray-950`). Added `min-h-[44px]` and `transition-colors` on tab buttons.

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7a059b0 | Dark mode infrastructure with theme system, header, CSS, and Shiki dual themes |
| 2 | 2067c8d | Dark mode variants on all components, responsive padding, touch targets |

## Verification Results

- `npx next build` completes without errors (both tasks)
- All components contain appropriate `dark:` variant classes
- Theme toggle cycles system/light/dark with localStorage persistence
- Shiki dual themes configured with `defaultColor: "light"` and CSS variable switching
- CSP `script-src` includes `sha256-` hash for FOWT inline script
- 44px minimum touch targets on all tab buttons and theme toggle
- Responsive padding `p-4 sm:p-8` on content pages
- 410 page supports dark mode via `@media (prefers-color-scheme: dark)`

## Self-Check: PASSED

All 17 files verified as FOUND. Both commit hashes (7a059b0, 2067c8d) verified in git log.
