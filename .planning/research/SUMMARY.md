# Project Research Summary

**Project:** paste.md
**Domain:** Web pastebin with Markdown rendering
**Researched:** 2026-05-14
**Confidence:** HIGH

## Executive Summary

paste.md is an anonymous, immutable Markdown pastebin -- a well-understood product category with clear table-stakes expectations and a few sharp technical risks. Experts build these as read-heavy, write-once systems with a thin API (two endpoints: create and read), client-side or server-side Markdown rendering, random URL slugs, and SQLite or equivalent single-file storage. The competitive landscape (Pastebin.com, GitHub Gist, Rentry, MdBin) shows that the combination of zero-friction anonymous access, full GFM rendering, live preview, and syntax highlighting -- all free and ad-free -- is genuinely unoccupied. paste.md has a clear positioning opportunity.

The recommended approach is a Next.js 16 App Router application with react-markdown (remark/rehype pipeline) for rendering, Shiki for VS Code-quality syntax highlighting via server components, SQLite via Drizzle ORM for storage, and Tailwind CSS v4 with the typography plugin for styling. This stack eliminates the need for a separate backend, provides type safety end-to-end, and produces a lightweight Docker image for self-hosting. The architecture researcher proposed client-side rendering, but the stack researcher's findings on Next.js 16 Server Components with react-markdown's `MarkdownAsync` and Shiki's server-side rendering are more compelling -- they deliver zero client-side JS for read-only paste views, which is the dominant use case. Server-side rendering for the read view is the right call here; client-side rendering is only needed for the live editor preview.

The primary risks are (1) XSS through unsanitized Markdown output, which is the single most documented vulnerability in this domain, with real CVEs against Pastebin.com and Reddit; (2) ReDoS via crafted Markdown input exploiting parser regex patterns; and (3) abuse of the anonymous service for malware hosting, spam, and data exfiltration. All three are well-understood and preventable: react-markdown's AST-based rendering plus rehype-sanitize plus CSP headers handles XSS; paste size limits and pinned dependencies handle ReDoS; rate limiting and an abuse reporting mechanism handle abuse. The schema must include `expires_at` from day one to prevent unbounded storage growth.

## Key Findings

### Recommended Stack

Next.js 16 with App Router and Server Components is the clear choice -- Turbopack default bundler, React Compiler auto-memoization, and `use cache` for paste reads. The rendering pipeline is `react-markdown` v10 with `remark-gfm` (GFM tables, task lists, strikethrough) piped through `rehype-sanitize` (XSS defense-in-depth) and `@shikijs/rehype` (VS Code-quality syntax highlighting, zero client JS). SQLite via `better-sqlite3` with Drizzle ORM provides type-safe, zero-ops storage -- a textbook fit for write-once-read-many data. Tailwind CSS v4 with `@tailwindcss/typography` gives instant prose styling for rendered Markdown.

**Core technologies:**
- **Next.js 16** (App Router): full-stack framework, Server Components for zero-JS paste views, Turbopack for fast builds
- **react-markdown 10** + remark-gfm + rehype-sanitize: safe AST-based Markdown rendering with GFM support
- **Shiki 4** (@shikijs/rehype): server-side syntax highlighting, VS Code quality, zero client bundle
- **SQLite** (better-sqlite3) + Drizzle ORM: zero-ops, single-file database with type-safe queries, no code generation
- **Tailwind CSS 4** + @tailwindcss/typography: utility CSS with instant Markdown prose styles
- **nanoid**: 8-char URL-safe random IDs for paste slugs (281 trillion combinations)

### Expected Features

**Must have (table stakes):**
- Create paste and get shareable URL -- the core product
- GFM Markdown rendering (tables, task lists, strikethrough, autolinks)
- Syntax highlighting in code blocks (free, not paywalled like Pastebin.com)
- Live preview while editing (split-pane or toggle)
- Raw text view alongside rendered view
- No registration required -- anonymous-first
- Responsive design (paste links are opened on phones)
- Paste expiration options (1h, 1d, 1w, 1mo, never)
- Copy button on code blocks
- Clean, minimal, ad-free UI

**Should have (differentiators):**
- Dark mode (low effort, high user satisfaction, system preference + manual toggle)
- Custom paste URLs (Rentry's killer feature: `paste.md/my-docs`)
- Keyboard shortcuts (Ctrl+Enter to publish, Ctrl+Shift+P to toggle preview)
- CLI/API for paste creation (`cat README.md | paste.md`)
- Mermaid diagram rendering (very few pastebins offer this)
- KaTeX math rendering (almost no pastebins offer this)
- Table of contents generation from headings

**Defer (v2+):**
- Embed snippet / oEmbed
- QR code for paste URL
- PDF export
- Paste forking/duplication

**Explicitly never build:** user accounts, paste editing, real-time collaboration, E2E encryption, file/image uploads, social features, code execution, paste discovery/trending, ads/paywalls, password protection.

### Architecture Approach

The system is a three-layer architecture: browser client, Next.js server (API + static), and SQLite data store. Paste creation flows through a POST endpoint that validates content (non-empty, under 512KB, rate limit check), generates an 8-char nanoid, and inserts into SQLite. Paste reading is a Server Component that fetches the raw Markdown, renders it through the remark/rehype/Shiki pipeline on the server, and sends fully rendered HTML to the client with zero JavaScript. The live editor preview is the one place that requires client-side rendering -- the same pipeline runs in the browser for real-time feedback as the user types.

**Major components:**
1. **Editor UI** -- textarea with live preview, keyboard shortcuts, localStorage persistence
2. **Markdown Rendering Pipeline** -- react-markdown + remark-gfm + rehype-sanitize + @shikijs/rehype
3. **API Layer** -- POST /api/paste (create), GET /api/paste/:id (retrieve), GET /api/paste/:id/raw (plain text)
4. **Data Store** -- SQLite `pastes` table (id, content, created_at, expires_at, size_bytes) with WAL mode
5. **Security Layer** -- rehype-sanitize, CSP headers, rate limiting, content size validation
6. **Expiration System** -- lazy check at read time (410 Gone) + background cleanup job for hard deletes

### Critical Pitfalls

1. **XSS via unsanitized Markdown** -- Use react-markdown (AST-based, no innerHTML) + rehype-sanitize + strict CSP headers. Never sanitize input; sanitize output. This must be correct from the first line of rendering code.
2. **ReDoS in Markdown parsers** -- Pin library versions, enforce 512KB paste size limit, debounce live preview (300-500ms), run preview parser in a Web Worker for isolation.
3. **Unbounded storage growth** -- Include `expires_at` in the schema from day one. Default to 30-day expiration for anonymous pastes. Implement lazy expiration at read time, background cleanup for hard deletes.
4. **Abuse as malware/spam platform** -- Rate limit creation (10-20 pastes/IP/hour), add robots.txt to block indexing, build "Report Abuse" mechanism, establish DMCA policy.
5. **Content loss on creation failure** -- Persist editor content to localStorage on change, restore on page load, clear only after successful creation.

## Implications for Roadmap

Based on combined research, here is the suggested phase structure. The ordering follows the dependency chain identified in ARCHITECTURE.md and FEATURES.md: data layer first, then basic UI on top of it, then the core Markdown differentiator, then hardening, then polish features.

### Phase 1: Foundation and Data Path
**Rationale:** Everything depends on being able to create and retrieve pastes. The database schema, API endpoints, and ID generation are the foundation. Getting this right first (especially `expires_at` in the schema) avoids the most painful pitfall of having to retrofit expiration later.
**Delivers:** Working API that creates/retrieves pastes via curl. SQLite database with correct schema. nanoid slug generation.
**Addresses:** Create paste + shareable URL (table stakes)
**Avoids:** Pitfall #3 (unbounded storage -- schema includes expiration from day one), Pitfall #6 (predictable URLs -- nanoid from the start)

### Phase 2: Core UI and Markdown Rendering
**Rationale:** The Markdown rendering pipeline is the critical path and the core differentiator. It must be secure from the start (XSS is the #1 risk). The editor with live preview and the paste view page are the two primary surfaces users interact with.
**Delivers:** Functional pastebin with GFM rendering, syntax highlighting, live editor preview, raw text view, and clean minimal UI.
**Addresses:** Markdown rendering, syntax highlighting, live preview, raw text view, clean UI, responsive design (all table stakes)
**Avoids:** Pitfall #1 (XSS -- rehype-sanitize + CSP from day one), Pitfall #5 (rendering performance -- debounced preview), Pitfall #8 (missing raw fallback), Pitfall #10 (content loss -- localStorage persistence)

### Phase 3: Hardening and Production Readiness
**Rationale:** Before public launch, the service needs abuse prevention, proper error handling, and expiration enforcement. Rate limiting and content size limits are the minimum viable security posture for an anonymous service.
**Delivers:** Rate limiting, content size enforcement, CSP headers, paste expiration (lazy + cleanup job), error pages (404, 410, 429), abuse reporting mechanism.
**Addresses:** Paste expiration options (table stakes), rate limiting, abuse prevention
**Avoids:** Pitfall #4 (abuse platform), Pitfall #3 (storage growth -- cleanup job active), Pitfall #2 (ReDoS -- size limits enforced)

### Phase 4: Polish and Competitive Features
**Rationale:** With the core product secure and production-ready, add the low-effort differentiators that improve user satisfaction and competitive positioning.
**Delivers:** Dark mode, custom paste URLs, copy button on code blocks, keyboard shortcuts.
**Addresses:** Dark mode, custom URLs, copy buttons, keyboard shortcuts (differentiators from FEATURES.md)
**Avoids:** No critical pitfalls -- these are additive features on a stable foundation.

### Phase 5: Power Features
**Rationale:** These features expand paste.md from "Markdown renderer" to "documentation sharing tool." They have medium complexity and are not required for launch but create strong competitive differentiation.
**Delivers:** Mermaid diagram rendering, KaTeX math, table of contents, CLI/API for paste creation.
**Addresses:** Mermaid, KaTeX, TOC, CLI/API (differentiators from FEATURES.md)
**Avoids:** No critical pitfalls -- these are plugin-style additions to the established rendering pipeline.

### Phase Ordering Rationale

- **Data before UI:** The API and schema are the foundation. The architecture research confirms every component depends on the data layer. Getting `expires_at` into the schema from Phase 1 prevents the most painful pitfall (retrofitting expiration).
- **Rendering before hardening:** Users need to see the product working before we harden it. But XSS prevention ships with the rendering pipeline, not as a later hardening step -- the pitfalls research is emphatic that security is not a bolt-on.
- **Polish before power features:** Dark mode, custom URLs, and keyboard shortcuts are low-effort, high-impact. Mermaid and KaTeX are medium-effort and serve narrower audiences. Ship delight first, depth second.
- **CLI/API in Phase 5, not earlier:** The REST API exists from Phase 1 (POST /api/paste). The "CLI/API" feature in Phase 5 is about documentation, a published API spec, and a shell alias/CLI tool -- not about building new endpoints.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Markdown Rendering):** The rendering pipeline (react-markdown + remark-gfm + rehype-sanitize + @shikijs/rehype) needs integration testing research. Shiki in Next.js Server Components may require `serverExternalPackages` configuration. The live preview (client-side rendering) uses a different code path than the read view (server-side rendering) -- managing two rendering paths needs careful planning.
- **Phase 5 (Power Features):** Mermaid.js integration with the remark/rehype pipeline is not as well-documented as Shiki. KaTeX integration via remark-math + rehype-katex is established but needs version compatibility verification with react-markdown v10.

Phases with standard patterns (skip deeper research):
- **Phase 1 (Foundation):** SQLite + Drizzle + nanoid is thoroughly documented. Standard CRUD.
- **Phase 3 (Hardening):** Rate limiting, CSP headers, and expiration cleanup are well-established patterns with official documentation (OWASP, MDN).
- **Phase 4 (Polish):** Dark mode, keyboard shortcuts, and custom URLs are standard web patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations backed by official docs, npm data, and version-specific release blogs. Next.js 16, react-markdown 10, Shiki 4, Tailwind 4 all verified with current releases. |
| Features | HIGH | Based on analysis of 15+ existing pastebin products. Competitive matrix is thorough. Feature categorization (table stakes vs differentiators) is well-supported. |
| Architecture | MEDIUM | Sound patterns but the architecture research recommends client-side-only rendering, which conflicts with the stack research's Server Components recommendation. Resolved in favor of SSR for read views + CSR for live preview (hybrid approach). |
| Pitfalls | HIGH | All critical pitfalls backed by real CVEs, documented exploits, and OWASP guidance. XSS and ReDoS risks are thoroughly evidenced. |

**Overall confidence:** HIGH

### Gaps to Address

- **Hybrid rendering path:** The read view (Server Components + Shiki SSR) and the editor preview (client-side rendering) are two different code paths for the same Markdown pipeline. How to share remark/rehype plugins between them without duplicating configuration needs validation during Phase 2 planning.
- **Shiki bundle size for client-side preview:** Shiki is ideal for server-side rendering (zero client JS), but the live preview runs in the browser. Options: use a lighter highlighter (highlight.js) for the preview only, or lazy-load Shiki grammars. Needs prototyping.
- **SQLite WAL mode in Docker:** WAL mode is required for concurrent reads, but SQLite in a Docker container with a mounted volume has known edge cases around file locking. Needs validation during Phase 1 implementation.
- **Custom URLs (Phase 4):** Reserving common words, handling slug uniqueness validation, and preventing abuse (registering offensive slugs) need design decisions during Phase 4 planning.
- **DMCA / abuse infrastructure:** The pitfalls research flags this as important but implementation details (abuse report storage, review workflow, automated vs manual) need definition during Phase 3 planning.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) -- framework capabilities, Turbopack, Server Components
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- rendering approach, security model, React 19 compatibility
- [Shiki documentation](https://shiki.style/packages/next) -- server-side syntax highlighting integration
- [Drizzle ORM docs](https://orm.drizzle.team/) -- SQLite driver, schema definition, migration tooling
- [nanoid GitHub](https://github.com/ai/nanoid) -- collision analysis, URL safety, cryptographic security
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) -- security headers
- [Markdown XSS Payloads](https://github.com/cujanovic/Markdown-XSS-Payloads) -- attack vectors for testing
- [HackerOne: Secure Markdown in React](https://www.hackerone.com/blog/secure-markdown-rendering-react-balancing-flexibility-and-safety) -- sanitization best practices
- [System Design Primer: Pastebin](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md) -- architecture patterns, scaling strategy

### Secondary (MEDIUM confidence)
- [Tailwind CSS v4 blog](https://tailwindcss.com/blog/tailwindcss-v4) -- CSS-first config, typography plugin integration
- [SOCRadar: Paste Sites Used by Threat Actors](https://socradar.io/blog/top-5-paste-sites-used-by-threat-actors/) -- abuse risk assessment
- [Snappify: Best Pastebin Alternatives](https://snappify.com/blog/best-pastebin-alternatives) -- competitive landscape
- [AlternativeTo: Pastebin Alternatives](https://alternativeto.net/software/pastebin/) -- feature comparison

---
*Research completed: 2026-05-14*
*Ready for roadmap: yes*
