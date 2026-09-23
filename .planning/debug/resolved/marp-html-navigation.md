---
status: resolved
trigger: "the marp presentations are not rendering the html content and the presentation controls don't move the slides forward"
created: 2026-09-22
updated: 2026-09-22
---

# Marp HTML and navigation

## Symptoms

- Expected: HTML content renders within slides and controls advance the visible slide.
- Actual: HTML content is missing or escaped and navigation does not advance.
- Reproduction: render a deck containing inline styles and an SVG, then advance a three-slide deck.

## Current Focus

next_action: none; changes verified locally.

## Hypotheses

1. React replaces slide markup when the counter changes, detaching cached nodes.
2. CSS overrides the viewer's display styles.
3. The Marp browser helper resets slide visibility.
4. CSP prevents hydration and control event handlers from running.

## Evidence

- Marp Core 4.4.0 preserves div/span content but strips style attributes and escapes SVG under its default HTML allowlist.
- The navigation regression initially failed: the counter became `2 / 3`, but the current DOM's three slide display styles were all empty strings.
- The same test passed after preserving the identity of the dangerouslySetInnerHTML object. React had replaced the slide elements on state changes, while the viewer updated detached nodes.
- The failure reproduced with the browser helper mocked. Valid script nonces and browser hydration ruled out CSP.

## Resolution

Root causes: the default HTML allowlist strips inline presentation styles and SVG; React resets slide markup when a fresh innerHTML object is passed on navigation.

Fix:

- Memoize the markup object, recapture slides when deck content changes, reset the index, and clamp navigation for an empty deck.
- Select only top-level slide SVGs.
- Extend Marp's allowlist with filtered presentation CSS and static SVG geometry, preserving script, event-handler and unsafe URL filtering.

Verification:

- Failing renderer regressions for inline layout styles and SVG now pass.
- Viewer regressions cover actual slide visibility, DOM identity, keyboard/button navigation, slide limits, Strict Mode, replacement decks, and empty decks.
- HTML safety regressions cover scripts, event handlers, unsafe/obfuscated URLs, CSS resource functions, SVG embeds, foreignObject and animation.
- Final full suite: 112 passed, 1 unrelated failure. The existing API defaults expiration to `1m`, while tests/api/paste.test.ts expects null; both files are unchanged.
- Production build including TypeScript passed.
- Headless Chrome verified styled HTML and SVG, computed slide visibility, Next/Previous, End, and tab remounts in development and production. No JavaScript/CSP errors; the existing favicon route returns 404.
- Formatting and recommended lint rules pass on all five changed TypeScript files using a temporary valid Biome config. Repository-wide lint remains blocked by the existing obsolete organizeImports config key.
- No debug instrumentation remains in application code.

Prevention: exercise the actual renderer/viewer DOM together and assert slide visibility, not just the counter. Existing Marp tests covered only frontmatter/URL parsing.
