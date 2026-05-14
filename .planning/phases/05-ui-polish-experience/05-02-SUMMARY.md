---
phase: 05-ui-polish-experience
plan: 02
subsystem: copy-clipboard-mobile-tests
tags: [copy-button, clipboard-api, mobile-responsive, overflow-scroll, vitest, dark-mode-tests]
dependency_graph:
  requires:
    - dark-mode-infrastructure
    - theme-toggle-component
    - header-component
    - shiki-dual-themes
    - csp-fowt-script-hash
  provides:
    - copy-to-clipboard-button
    - copyable-pre-wrapper
    - paste-view-copy-integration
    - mobile-code-block-overflow
    - theme-toggle-tests
    - copy-button-tests
    - dual-theme-rendering-tests
    - csp-hash-tests
  affects:
    - app/components/copy-button.tsx
    - app/components/copyable-pre.tsx
    - app/[slug]/components/paste-view.tsx
    - app/components/markdown-renderer.tsx
    - tests/components/theme.test.ts
    - tests/components/copy-button.test.ts
    - tests/components/markdown-renderer.test.tsx
    - tests/security/headers.test.ts
tech_stack:
  added:
    - "@testing-library/react (dev)"
    - "@testing-library/dom (dev)"
    - "jsdom (dev)"
  patterns:
    - navigator-clipboard-writetext
    - createRoot-portal-dom-injection
    - group-hover-opacity-reveal
    - media-hover-none-touch-fallback
key_files:
  created:
    - app/components/copy-button.tsx
    - app/components/copyable-pre.tsx
    - tests/components/theme.test.ts
    - tests/components/copy-button.test.ts
  modified:
    - app/[slug]/components/paste-view.tsx
    - app/components/markdown-renderer.tsx
    - tests/components/markdown-renderer.test.tsx
    - tests/security/headers.test.ts
decisions:
  - CopyButton as standalone client component with textContent string prop for SRP compliance
  - CopyablePre uses useEffect + state to extract pre textContent after mount (avoids stale ref on initial render)
  - PasteView uses createRoot to inject CopyButtons into server-rendered pre elements (preserves RSC rendering path)
  - Installed @testing-library/react and jsdom for copy-button jsdom-environment tests
metrics:
  duration: 4min
  completed: 2026-05-14
---

# Phase 5 Plan 2: Copy-to-Clipboard, Mobile Responsive, and Phase Tests Summary

CopyButton and CopyablePre components with clipboard API, DOM-injected copy buttons in paste view, horizontal overflow scroll on mobile code blocks, and comprehensive test coverage for theme toggle, copy behavior, Shiki dual themes, and CSP hash.

## What Was Done

### Task 1: Copy-to-clipboard components, paste view integration, and mobile responsive code blocks (eb3784f)

Built the complete copy-to-clipboard feature and mobile responsive code block handling:

- **copy-button.tsx**: Client Component using `navigator.clipboard.writeText()` with 2-second "Copied" feedback via `useState` and `setTimeout`. Inline SVG icons (clipboard idle, checkmark success). 44px minimum touch targets per D-12. Focus-visible ring for keyboard accessibility. Silent fail on clipboard API error. Proper timeout cleanup on unmount via `useEffect` and `useRef`.
- **copyable-pre.tsx**: Client Component wrapping `<pre>` with positioned CopyButton. Uses `useRef` on the pre element and `useEffect` to extract `textContent` after mount into state (avoids stale ref timing issue). Hover-reveal pattern (`opacity-0 group-hover:opacity-100`) with touch device fallback via `[@media(hover:none)]:opacity-100`.
- **paste-view.tsx**: Extended with DOM-based copy button injection for server-rendered content. Uses `useEffect` with `querySelectorAll("pre")` to find code blocks, wraps each in a relative container, and uses `createRoot` to render CopyButton portals. Properly unmounts roots on cleanup. Content wrapped in a ref'd div for DOM querying.
- **markdown-renderer.tsx**: Added `prose-pre:overflow-x-auto` to article className for D-11 horizontal scrolling on mobile code blocks without line wrapping.

### Task 2: Automated tests for theme, copy button, dual-theme rendering, and CSP hash (b90ea3d)

Created two new test files and updated two existing ones:

- **tests/components/theme.test.ts** (NEW): 4 test cases validating THEME_SCRIPT string contains `paste-md-theme` localStorage key, `classList.toggle` with `dark`, `prefers-color-scheme: dark` media query, and `try/catch` error handling. All prefixed with `UI-04`.
- **tests/components/copy-button.test.ts** (NEW): 4 test cases in jsdom environment validating initial `aria-label="Copy code"`, `navigator.clipboard.writeText` call with correct text, `aria-label="Copied"` after click, and 2-second revert using `vi.useFakeTimers`. All prefixed with `UI-03`.
- **tests/components/markdown-renderer.test.tsx** (UPDATED): Updated `processMarkdown` helper to use `themes: { light: "github-light", dark: "github-dark" }` with `defaultColor: "light"` matching the component. Added new `UI-04: renders dual-theme CSS variables for code blocks` test asserting `--shiki-dark` in output.
- **tests/security/headers.test.ts** (UPDATED): Added `UI-04: CSP script-src includes FOWT prevention script hash` test asserting `sha256-` present in the CSP header value.

### Task 3: Human verification checkpoint

Auto-approved: complete UI polish with dark mode, copy-to-clipboard, mobile responsive layout, and full test coverage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale ref timing in CopyablePre**
- **Found during:** Task 1
- **Issue:** Plan specified `textContent={preRef.current?.textContent ?? ""}` which reads the ref at render time, but the ref is null on initial render and setting it does not trigger re-render. CopyButton would always receive empty string.
- **Fix:** Added `useState` + `useEffect` in CopyablePre to capture `textContent` after mount when the ref is populated, keeping CopyButton's `textContent: string` prop interface unchanged.
- **Files modified:** app/components/copyable-pre.tsx
- **Commit:** eb3784f

**2. [Rule 3 - Blocking] Installed jsdom and @testing-library/react for copy button tests**
- **Found during:** Task 2
- **Issue:** The plan requires `@vitest-environment jsdom` for copy-button tests and `@testing-library/react` for rendering. Neither was installed.
- **Fix:** Installed `jsdom`, `@testing-library/react`, and `@testing-library/dom` as dev dependencies.
- **Files modified:** package.json, package-lock.json
- **Commit:** b90ea3d

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | eb3784f | Copy-to-clipboard components, paste view integration, mobile overflow |
| 2 | b90ea3d | Theme, copy button, dual-theme, and CSP hash tests |

## Verification Results

- `npx next build` completes without errors
- All 27 relevant tests pass (4 theme + 4 copy button + 8 markdown renderer + 11 security/headers)
- CopyButton calls `navigator.clipboard.writeText` with provided textContent
- CopyButton displays "Copy code" / "Copied" aria-labels with 2s timeout
- Code blocks have `overflow-x: auto` for mobile horizontal scrolling
- PasteView injects copy buttons into server-rendered pre elements via DOM
- Theme script validates localStorage key, class toggle, media query, error handling
- Markdown renderer outputs `--shiki-dark` CSS variables for dual-theme code blocks
- CSP header contains `sha256-` hash for FOWT prevention script

## Self-Check: PASSED

All 8 files verified as FOUND. Both commit hashes (eb3784f, b90ea3d) verified in git log.
