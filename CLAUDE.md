<!-- GSD:project-start source:PROJECT.md -->
## Project

**paste.md**

A web-based pastebin that renders Markdown content. Users can create, share, and view pastes with full Markdown rendering including syntax highlighting, tables, and other formatting — turning raw text into beautiful, readable documents.

**Core Value:** Users can quickly paste Markdown content and get a shareable link that renders it beautifully — zero friction from paste to share.

### Constraints

- **Simplicity**: Minimal UI, no unnecessary features — paste and share
- **Performance**: Page load and rendering must feel instant
- **Accessibility**: Rendered output must be readable and accessible
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.x (16.2.2+) | Full-stack React framework | App Router with Server Components eliminates the need for a separate backend. Turbopack is now the default bundler (2-5x faster builds). Stable React Compiler auto-memoizes components. Cache Components (`use cache`) provide fine-grained caching for paste reads. Standalone output mode produces a ~100-200MB Docker image for self-hosting. | HIGH |
| React | 19.2+ | UI library | Bundled with Next.js 16. Server Components render markdown on the server with zero client JS for read-only paste views. `MarkdownAsync` in react-markdown v10 works natively with RSC. | HIGH |
| TypeScript | 5.x | Type safety | Next.js 16 has first-class TypeScript support. Drizzle ORM provides compile-time type-checked queries without code generation. No reason to use plain JS in 2026. | HIGH |
### Markdown Rendering
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-markdown | 10.1.0 | Markdown-to-React rendering | 20M+ weekly downloads. Builds a virtual DOM (React only re-renders what changed). Supports remark/rehype plugin ecosystem. `MarkdownAsync` component works in Server Components. No `dangerouslySetInnerHTML`. Fully compatible with React 19. | HIGH |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown | Tables, strikethrough, task lists, autolink literals, footnotes. Users expect GFM -- it is the de facto markdown standard. | HIGH |
| rehype-sanitize | latest | XSS prevention | react-markdown is secure by default (ignores raw HTML), but adding rehype-sanitize provides defense-in-depth for any future pipeline changes (e.g., if rehype-raw is added later). Critical for user-generated content. | HIGH |
| shiki | 4.0.2 | Syntax highlighting for code blocks | VS Code-quality highlighting using TextMate grammars. Server-side rendering means zero client JS for syntax highlighting. Supports all VS Code themes. Used by VitePress, Astro, Nuxt. Requires Node >= 20. | HIGH |
| @shikijs/rehype | 4.0.2 | Shiki integration with rehype pipeline | Plugs Shiki into the react-markdown rehype pipeline. Processes code blocks during server rendering. Avoids manual `codeToHtml` calls. | MEDIUM |
### Styling
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.3.x | Utility-first CSS | Ground-up rewrite: 5x faster full builds, 100x faster incremental. CSS-first config via `@theme` (no `tailwind.config.js`). Automatic content detection. Built-in container queries. First-party Vite plugin. | HIGH |
| @tailwindcss/typography | 0.5.19 | Prose styles for rendered markdown | The `prose` class provides beautiful typographic defaults for HTML you don't control -- exactly what rendered markdown is. Supports size modifiers (`prose-lg`), dark mode (`dark:prose-invert`), element-specific overrides. In Tailwind v4, loaded via `@plugin` directive. | HIGH |
### Database
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| SQLite (via better-sqlite3) | 12.10.0 | Paste storage | A pastebin is a textbook SQLite use case: write-once-read-many, simple flat records, low concurrent writes. Zero ops burden -- single file, no database server. Synchronous API means no connection pool management. 2-5x faster than PostgreSQL for simple reads (zero network latency). | HIGH |
| Drizzle ORM | 0.45.2 | Type-safe database access | 7.4kb min+gzip, zero binary dependencies. Schema defined in TypeScript -- types update automatically, no code generation step. Native better-sqlite3 driver support. SQL-like API keeps queries predictable. Works in server components without edge runtime complications. | HIGH |
| drizzle-kit | latest | Migrations and schema management | Generates SQL migrations from schema changes. `drizzle-kit push` for development, `drizzle-kit generate` + `drizzle-kit migrate` for production. | HIGH |
### ID Generation
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| nanoid | 5.1.11 | Paste URL IDs | 118 bytes, URL-safe by default (A-Za-z0-9_-). Cryptographically secure (uses `crypto` module). Customizable length -- use `nanoid(8)` for short paste URLs (~2.8 trillion combinations). 134M+ weekly downloads. No dependencies. | HIGH |
### Development Tools
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Biome | latest | Linting and formatting | Next.js 16 removed `next lint`. Biome is a single tool for both linting and formatting, written in Rust, significantly faster than ESLint + Prettier. Drop-in replacement. | MEDIUM |
| @types/better-sqlite3 | 7.6.13 | TypeScript types for better-sqlite3 | Dev dependency for type-safe SQLite access. | HIGH |
### Deployment
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker | - | Container deployment | Next.js standalone output mode + multi-stage Docker build produces lean images. SQLite file lives in a mounted volume. Works anywhere: VPS, Railway, Coolify, etc. $5-12/month on a basic VPS. | HIGH |
| Vercel | - | Alternative deployment | Zero-config for Next.js projects. Free tier (100GB bandwidth) is sufficient for a pastebin. However, SQLite requires a persistent filesystem, which Vercel serverless does not provide -- would need to swap to Turso/D1 or PostgreSQL (Neon/Supabase). Use Vercel only if willing to change the database layer. | MEDIUM |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Astro | Astro is great for static sites but paste creation needs server-side API routes and real-time preview. Next.js handles both SSR and interactivity natively. |
| Framework | Next.js 16 | Remix | Viable alternative, but Next.js has larger ecosystem, better docs, and Turbopack performance. Remix does not offer the same level of server component integration. |
| Markdown | react-markdown | marked | marked outputs raw HTML strings, requiring `dangerouslySetInnerHTML`. react-markdown builds React elements safely and supports the remark/rehype plugin ecosystem. |
| Markdown | react-markdown | markdown-to-jsx | Smaller bundle but weaker plugin ecosystem. No remark/rehype support means no access to hundreds of unified plugins. |
| Markdown | react-markdown | MDX (@next/mdx) | MDX is designed for authoring content with JSX components, not for rendering arbitrary user-submitted markdown. Overkill and introduces security concerns (user-submitted JSX). |
| Syntax highlighting | shiki | Prism.js | Prism's development has stalled (v2 not happening). Shiki produces VS Code-quality output. Server-side rendering eliminates Prism's client-side bundle. |
| Syntax highlighting | shiki | highlight.js | highlight.js is lighter but lower quality. Shiki's server-side rendering eliminates the bundle size concern entirely. |
| Database | SQLite | PostgreSQL | PostgreSQL requires running a database server -- unnecessary ops burden for a simple pastebin. SQLite is 2-5x faster for simple reads and eliminates network latency. PostgreSQL only wins at high concurrent writes, which a pastebin does not need. |
| ORM | Drizzle | Prisma | Prisma requires a code generation step (`prisma generate`), has a larger runtime (~90% bigger bundle), and needs the Accelerate service for edge runtimes. Drizzle's SQL-like API is more predictable and its 7.4kb bundle is serverless-ready. |
| ID generation | nanoid | UUID v4 | UUID produces 36-character strings with hyphens. nanoid produces 21 characters (or less) with URL-safe characters. For paste URLs, shorter is better. |
| ID generation | nanoid | hashids/sqids | Encoding sequential IDs leaks paste count and creation order. Random IDs (nanoid) are unpredictable and don't expose internal state. |
| Styling | Tailwind CSS | CSS Modules | Tailwind's utility classes are faster to write and maintain for a small project. The typography plugin provides instant markdown styling. CSS Modules add file proliferation without benefit for this scope. |
| Deployment | Docker/VPS | Vercel serverless | SQLite requires a persistent filesystem. Vercel's serverless functions are ephemeral. Switching to Vercel means changing the database to Turso, D1, or Neon -- unnecessary complexity for a simple app. |
## What NOT to Use
| Technology | Why Not |
|------------|---------|
| MongoDB / NoSQL | Pastes are structured text with metadata. Relational model is simpler and more efficient. NoSQL adds unnecessary complexity. |
| Redis | Unnecessary caching layer for v1. SQLite reads are already sub-millisecond. Add Redis only if traffic justifies it (unlikely for a pastebin). |
| GraphQL | Two endpoints (create paste, read paste) do not justify GraphQL's overhead. REST is simpler. |
| tRPC | Only two API endpoints. tRPC's type-safe RPC is valuable for complex APIs, but overkill here. Server Actions in Next.js 16 handle form submission natively. |
| Socket.io / WebSockets | No real-time collaboration. Preview updates happen client-side via state changes, not server pushes. |
| Clerk / Auth0 / NextAuth | Project is explicitly anonymous-first. No authentication in v1. |
| Webpack | Turbopack is the default in Next.js 16. Only use `--webpack` flag if a specific library is incompatible, which is increasingly rare. |
| ESLint + Prettier | Biome replaces both with a single, faster tool. Next.js 16 removed `next lint` -- use Biome directly. |
## Installation
# Core
# Markdown rendering
# Styling
# Database
# Dev dependencies
## Key Configuration Notes
### Tailwind v4 (CSS-first, no config file)
### Shiki in Next.js Server Components
### Drizzle Schema (example)
### nanoid for paste IDs
## Sources
- [Next.js 16 release blog](https://nextjs.org/blog/next-16)
- [Next.js 16.1 release blog](https://nextjs.org/blog/next-16-1)
- [Next.js upgrading guide v16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown)
- [react-markdown npm](https://www.npmjs.com/package/react-markdown)
- [react-markdown changelog](https://github.com/remarkjs/react-markdown/blob/main/changelog.md)
- [Shiki documentation](https://shiki.style/packages/next)
- [Shiki npm](https://www.npmjs.com/package/shiki)
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v4.3 blog](https://tailwindcss.com/blog/tailwindcss-v4-3)
- [@tailwindcss/typography npm](https://www.npmjs.com/package/@tailwindcss/typography)
- [Drizzle ORM documentation](https://orm.drizzle.team/)
- [Drizzle ORM SQLite guide](https://orm.drizzle.team/docs/get-started-sqlite)
- [nanoid GitHub](https://github.com/ai/nanoid)
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3)
- [Syntax highlighter comparison (chsm.dev)](https://chsm.dev/blog/2025/01/08/comparing-web-code-highlighters)
- [Shiki vs Prism vs highlight.js (PkgPulse)](https://www.pkgpulse.com/blog/shiki-vs-prismjs-vs-highlightjs-syntax-highlighting-2026)
- [Drizzle vs Prisma comparison (makerkit)](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [SQLite in 2026 analysis](https://www.javacodegeeks.com/2026/05/sqlite-in-2026-why-serious-apps-are-choosing-it-over-postgres.html)
- [rehype-sanitize GitHub](https://github.com/rehypejs/rehype-sanitize)
- [Secure Markdown rendering in React (HackerOne)](https://www.hackerone.com/blog/secure-markdown-rendering-react-balancing-flexibility-and-safety)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
