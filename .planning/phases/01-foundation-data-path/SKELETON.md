# Walking Skeleton -- paste.md

**Phase:** 1
**Generated:** 2026-05-14

## Capability Proven End-to-End

A user can paste text content on the home page, submit it, and receive a unique short URL that displays the stored content when visited.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router (Turbopack) | Server Components for paste views (zero client JS), Client Components for editor form. Full-stack in one framework. |
| Data layer | SQLite (better-sqlite3 12.10.0) + Drizzle ORM 0.45.2 | Zero-ops single-file DB. Sync API, no connection pool. Drizzle provides type-safe queries without codegen. |
| Auth | None (anonymous-first) | No authentication -- contradicts core value of zero-friction paste-and-share. |
| ID generation | nanoid(8) -- 8-char URL-safe slugs | Short URLs are the product. 281 trillion combinations, cryptographically secure. |
| Deployment target | Docker on VPS (SQLite needs persistent filesystem) | Standalone Next.js output + mounted volume for SQLite. $5-12/month VPS handles the load. |
| Directory layout | Next.js App Router conventions: app/ for routes, lib/ for shared code | app/api/paste/ for API routes, app/[slug]/ for paste view, lib/db/ for database layer. |
| Styling | Tailwind CSS 4.3 (CSS-first config) | Utility classes, no config file. @tailwindcss/typography for rendered markdown in later phases. |
| Test framework | Vitest | Fast, Vite-native, TypeScript-first. Compatible with Next.js 16 Turbopack. |
| Linter/formatter | Biome | Next.js 16 removed next lint. Biome replaces ESLint + Prettier in one fast tool. |

## Stack Touched in Phase 1

- [x] Project scaffold (Next.js 16, Turbopack, TypeScript, Tailwind, Biome, Vitest)
- [x] Routing -- dynamic `[slug]` route for paste view, `/` for creation
- [x] Database -- SQLite write (insert paste) AND read (fetch paste by ID)
- [x] UI -- paste creation form (textarea + submit) wired to POST /api/paste
- [x] Deployment -- `npm run dev` exercises full stack locally (Docker deferred to later phase)

## Out of Scope (Deferred to Later Slices)

- Markdown rendering (Phase 2)
- Syntax highlighting (Phase 2)
- Live preview editor (Phase 2)
- Paste expiration UI (Phase 3 -- but `expires_at` column exists in schema)
- Expired paste handling (Phase 3)
- Raw/rendered view toggle (Phase 3)
- CSP headers (Phase 4)
- Rate limiting (Phase 4)
- Dark mode (Phase 5)
- Responsive polish (Phase 5)
- Copy-to-clipboard (Phase 5)
- Docker deployment configuration

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Markdown rendering + syntax highlighting + live preview editor
- Phase 3: Expiration controls + expired paste handling + raw view toggle
- Phase 4: CSP headers + rate limiting
- Phase 5: Responsive UI + dark mode + copy-to-clipboard
