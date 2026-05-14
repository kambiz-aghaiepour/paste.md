# Phase 2: Markdown Rendering & Editor - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase transforms the paste view from raw plain text into beautifully rendered Markdown, and upgrades the editor with a live preview. Two distinct rendering contexts exist: server-side rendering for the paste view page (Server Component + Shiki) and client-side rendering for the editor's live preview (Client Component + react-markdown). This phase also adds localStorage draft persistence and XSS sanitization.

</domain>

<decisions>
## Implementation Decisions

### Rendering Architecture
- **D-01:** Paste view page (`app/[slug]/page.tsx`) renders Markdown server-side using react-markdown with `MarkdownAsync` in a Server Component. This produces zero client JS for read-only paste views.
- **D-02:** Editor live preview renders Markdown client-side using react-markdown in the existing Client Component (`app/components/paste-form.tsx`).
- **D-03:** Use remark-gfm for GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks) in both server and client rendering paths.
- **D-04:** Use rehype-sanitize for defense-in-depth XSS prevention in both rendering paths.

### Syntax Highlighting
- **D-05:** Paste view page uses Shiki (via @shikijs/rehype) for VS Code-quality server-side syntax highlighting. Zero client JS cost.
- **D-06:** Editor live preview does NOT include syntax highlighting. Code blocks render as styled `<pre>/<code>` without language highlighting. This keeps the client bundle small and the preview responsive. Users see full highlighting on the saved paste page.
- **D-07:** Researcher should validate Shiki client-side bundle size as noted in STATE.md research gap. If a lightweight client-side option is feasible (highlight.js or Shiki fine-grained bundle), it can be added later without architectural changes.

### Live Preview
- **D-08:** Preview updates client-side using react-markdown — no server roundtrip. Debounce input by ~300ms to avoid rendering on every keystroke.
- **D-09:** Preview renders in real-time as the user types, showing the same GFM features (tables, task lists, links) that the final paste view will have (minus syntax highlighting).

### Split-Pane Layout
- **D-10:** Desktop layout uses a fixed 50/50 horizontal split — editor textarea on the left, rendered preview on the right.
- **D-11:** Mobile layout stacks editor and preview vertically with a toggle button to switch between edit and preview views. No simultaneous side-by-side on small screens.
- **D-12:** Use Tailwind responsive breakpoints for the desktop/mobile transition. No resizable drag handle — simplicity over flexibility.

### localStorage Persistence
- **D-13:** Auto-save editor content to localStorage on every keystroke, debounced by ~1 second. Key: `paste-md-draft`.
- **D-14:** On page load, if a draft exists in localStorage, restore it into the editor. Show a subtle, dismissible indicator (e.g., "Draft restored") so the user knows content was recovered.
- **D-15:** Clear localStorage draft immediately after successful paste creation. The draft is no longer needed once the paste has a permalink.

### Typography & Styling
- **D-16:** Install @tailwindcss/typography and use the `prose` class for rendered Markdown output. This provides beautiful typographic defaults for headings, paragraphs, lists, tables, code blocks, and blockquotes.
- **D-17:** Apply consistent prose styling in both the paste view page and the editor live preview for visual consistency.

### Claude's Discretion
- Specific Shiki theme selection (e.g., github-light, one-dark-pro)
- Debounce implementation details (custom hook vs library)
- Exact Tailwind breakpoint for desktop/mobile split-pane transition
- Preview toggle button placement and styling on mobile
- Draft restored indicator styling and auto-dismiss behavior
- react-markdown component structure and file organization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` -- Project vision, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` -- Full requirements with REQ-IDs (REND-01..03, EDIT-01..03, SECU-01 for this phase)

### Prior Phase
- `.planning/phases/01-foundation-data-path/01-CONTEXT.md` -- Phase 1 decisions (URL format, API design, schema, validation)

### Technology Stack
- `CLAUDE.md` -- Technology stack recommendations with versions and configuration notes (react-markdown 10.1.0, shiki 4.0.2, @shikijs/rehype 4.0.2, remark-gfm 4.0.1, rehype-sanitize, @tailwindcss/typography 0.5.19)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/paste-form.tsx` -- Client Component with textarea, error handling, submit flow. Needs to be extended with preview pane and localStorage, not replaced.
- `app/[slug]/page.tsx` -- Server Component fetching paste by slug. Currently renders raw text in `<pre>`. Replace `<pre>` body with react-markdown rendering.
- `lib/db/queries.ts` -- `getPasteById()` returns full paste including `content` field. No changes needed.

### Established Patterns
- Server Components for data-fetching pages (paste view)
- Client Components with `"use client"` for interactive forms
- Tailwind utility classes for styling (no CSS modules)
- Fetch-based API calls from client to `/api/paste`
- `@/` path alias for imports

### Integration Points
- `app/[slug]/page.tsx` -- primary integration point for Markdown rendering
- `app/components/paste-form.tsx` -- primary integration point for live preview, split-pane, localStorage
- `app/globals.css` -- add @tailwindcss/typography plugin import
- `package.json` -- new dependencies: react-markdown, remark-gfm, rehype-sanitize, shiki, @shikijs/rehype, @tailwindcss/typography

</code_context>

<specifics>
## Specific Ideas

- STATE.md notes a research gap: "Shiki client-side bundle size for live preview -- may need lighter alternative (highlight.js) for editor." Decision D-06/D-07 defers client-side highlighting, but researcher should investigate feasibility.
- STATE.md notes: "Hybrid rendering path (SSR for paste views, CSR for editor preview) needs validation during Phase 2 planning." The architecture in D-01/D-02 addresses this.
- CLAUDE.md recommends react-markdown v10.1.0 with `MarkdownAsync` for Server Components -- researcher should confirm API compatibility.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 2-Markdown Rendering & Editor*
*Context gathered: 2026-05-14*
