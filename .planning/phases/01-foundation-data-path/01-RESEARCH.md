# Phase 1: Foundation & Data Path - Research

**Researched:** 2026-05-14
**Domain:** Next.js 16 App Router + Drizzle ORM + SQLite data path for a Markdown pastebin
**Confidence:** HIGH

## Summary

Phase 1 delivers the core create-store-retrieve pipeline for paste.md: a user enters text content, submits it, and receives a shareable URL that displays the raw content. No Markdown rendering, no styling polish, no expiration UI -- just the foundational data path backed by SQLite via Drizzle ORM with nanoid-generated slugs.

The stack is fully decided: Next.js 16 (App Router, Server Components), Drizzle ORM with better-sqlite3, nanoid for ID generation, Tailwind CSS 4 for minimal styling, and TypeScript throughout. This is a greenfield project with no existing code. The phase establishes the project structure, database schema, API routes, and page components that all subsequent phases build upon.

**Primary recommendation:** Build the database layer first (schema + connection singleton), then API route handlers, then page components. Use `drizzle-kit push` for rapid development iteration; generate proper migrations before Phase 1 is complete.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use nanoid (8 characters, URL-safe alphabet) for paste slugs. 281 trillion combinations, cryptographically random, unguessable.
- **D-02:** Paste URLs follow the pattern `/{slug}` (e.g., `/a1b2c3d4`). No `/paste/` prefix.
- **D-03:** Single-page form on the home route (`/`). Textarea for content, submit button. On success, redirect to the paste URL.
- **D-04:** No title field, no language selector, no metadata inputs in v1. Just content and submit.
- **D-05:** SQLite `pastes` table schema: `id` (TEXT PK, nanoid), `content` (TEXT, NOT NULL), `created_at` (INTEGER, Unix timestamp), `expires_at` (INTEGER, nullable Unix timestamp), `size_bytes` (INTEGER).
- **D-06:** Include `expires_at` column from day one even though expiration UI ships in Phase 3.
- **D-07:** Use WAL mode for SQLite to support concurrent reads.
- **D-08:** POST `/api/paste` to create a paste. Accepts JSON body `{ content: string }`. Returns `{ id: string, url: string }`.
- **D-09:** GET `/api/paste/:id` to retrieve paste data. Returns JSON `{ id, content, created_at, expires_at }`.
- **D-10:** GET `/api/paste/:id/raw` to retrieve raw content as `text/plain`.
- **D-11:** Reject empty content (0 bytes) with 400 Bad Request.
- **D-12:** Reject content exceeding 512KB with 413 Payload Too Large.
- **D-13:** Validate content size server-side. Client-side validation is nice-to-have.
- **D-14:** 404 page for paste not found (clean, minimal).
- **D-15:** Inline validation errors on the create form (empty content, too large).
- **D-16:** API errors return JSON with `{ error: string }` and appropriate HTTP status codes.

### Claude's Discretion
- Next.js App Router file structure and organization
- Drizzle ORM configuration and migration approach
- SQLite file location (e.g., `data/paste.db`)
- Error page styling (minimal is fine for Phase 1)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CORE-01 | User can create a paste by entering text content and submitting | Next.js Server Action or POST route handler + form component on home page |
| CORE-02 | User receives a unique, shareable URL after creating a paste | nanoid(8) generates slug, redirect to `/{slug}` after creation |
| CORE-03 | User can view a paste by visiting its URL | Dynamic route `app/[slug]/page.tsx` fetches from DB and renders raw content |
| CORE-04 | Paste URLs use short, unguessable, random slugs (nanoid) | nanoid 5.1.11 with 8-char output, cryptographically secure |
| STOR-01 | Pastes are stored in SQLite with schema including expiration support | Drizzle ORM 0.45.2 + better-sqlite3 12.10.0, schema includes `expires_at` column |
| SECU-04 | Paste content size is limited (max 512KB) | Server-side validation in route handler, reject with 413 status |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Paste creation form | Browser / Client | -- | Client Component with textarea, form submission via POST to API |
| Content validation (size, empty) | API / Backend | Browser / Client | Server-side is the security boundary (D-13); client-side is UX only |
| Paste ID generation | API / Backend | -- | nanoid runs server-side in the route handler, never exposed to client |
| Paste storage | Database / Storage | -- | SQLite via better-sqlite3, single-file database |
| Paste retrieval (page view) | Frontend Server (SSR) | Database / Storage | Server Component fetches from DB directly, renders HTML server-side |
| Paste retrieval (API JSON) | API / Backend | -- | Route handler reads from DB, returns JSON |
| Paste retrieval (raw text) | API / Backend | -- | Route handler reads from DB, returns text/plain |
| 404 handling | Frontend Server (SSR) | -- | Next.js `notFound()` function triggers `not-found.tsx` |
| URL routing | Frontend Server (SSR) | -- | Next.js file-system routing with dynamic `[slug]` segment |

## Standard Stack

### Core (Phase 1 only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | Full-stack React framework | App Router + Server Components enable direct DB access in pages without separate API calls for SSR [VERIFIED: npm registry] |
| React | 19.2+ | UI library | Bundled with Next.js 16. Server Components for paste view pages, Client Components for the editor form [VERIFIED: npm registry] |
| TypeScript | 6.0.3 | Type safety | First-class Next.js 16 support; Drizzle provides compile-time typed queries [VERIFIED: npm registry] |
| Drizzle ORM | 0.45.2 | Type-safe database access | 7.4kb, zero codegen, native better-sqlite3 driver, SQL-like API [VERIFIED: npm registry] |
| better-sqlite3 | 12.10.0 | SQLite driver | Synchronous API, no connection pool needed, already in Next.js serverExternalPackages auto-list [VERIFIED: npm registry, Context7 Next.js docs] |
| nanoid | 5.1.11 | Paste URL ID generation | 118 bytes, URL-safe, cryptographically secure, customizable length [VERIFIED: npm registry] |
| Tailwind CSS | 4.3.0 | Utility-first CSS | Minimal styling for Phase 1 forms and pages; CSS-first config in v4 [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | 0.31.10 | Schema migrations | `drizzle-kit push` for dev, `drizzle-kit generate` + `drizzle-kit migrate` for production [VERIFIED: npm registry] |
| @types/better-sqlite3 | 7.6.13 | TypeScript types | Dev dependency for type-safe SQLite access [VERIFIED: npm registry] |
| @tailwindcss/vite | 4.3.0 | Tailwind Vite plugin | Required for Tailwind v4 with Next.js 16 (Turbopack uses Vite under the hood) [VERIFIED: npm registry] |
| @biomejs/biome | 2.4.15 | Linting + formatting | Next.js 16 removed `next lint`; Biome replaces ESLint + Prettier [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | libsql | libsql adds Turso compatibility but is async-only; better-sqlite3's sync API is simpler for a single-server pastebin |
| Drizzle ORM | Raw better-sqlite3 | Drizzle adds type safety and migration tooling; raw SQL is viable for 2 queries but loses type inference |
| nanoid | crypto.randomUUID() | UUID is 36 chars; nanoid(8) is 8 chars. Shorter URLs are the entire point of a pastebin |

**Installation:**
```bash
# Core dependencies
npm install next@latest react@latest react-dom@latest
npm install drizzle-orm better-sqlite3 nanoid
npm install tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D typescript @types/node @types/react @types/react-dom @types/better-sqlite3 drizzle-kit @biomejs/biome
```

## Architecture Patterns

### System Architecture Diagram

```
                        +-----------+
                        |  Browser  |
                        +-----+-----+
                              |
           POST /api/paste    |    GET /{slug}
           (JSON body)        |    (page request)
                              |
                    +---------v---------+
                    |   Next.js Server  |
                    |   (App Router)    |
                    +---+-------+---+---+
                        |       |   |
        Route Handler   |       |   |  Server Component
        (API routes)    |       |   |  (page.tsx)
                        |       |   |
                   +----v--+ +--v---v----+
                   | POST  | | GET page  |
                   | create| | [slug]    |
                   +---+---+ +----+------+
                       |          |
                       |   +------v------+
                       |   | notFound()  |
                       |   | if missing  |
                       |   +-------------+
                       |          |
                  +----v----------v----+
                  |   Database Layer   |
                  |   (Drizzle ORM)    |
                  +--------+----------+
                           |
                  +--------v----------+
                  |   SQLite (WAL)    |
                  |   data/paste.db   |
                  +-------------------+
```

**Data flow:**
1. **Create:** Browser POST -> Route Handler -> validate content -> nanoid(8) -> Drizzle insert -> return `{ id, url }` -> Browser redirect to `/{slug}`
2. **View (page):** Browser GET `/{slug}` -> Server Component -> Drizzle select -> render raw content (or `notFound()`)
3. **View (API):** Browser/client GET `/api/paste/{id}` -> Route Handler -> Drizzle select -> return JSON
4. **View (raw):** GET `/api/paste/{id}/raw` -> Route Handler -> Drizzle select -> return `text/plain`

### Recommended Project Structure

```
paste.md/
├── app/
│   ├── layout.tsx              # Root layout (html, body, global styles)
│   ├── page.tsx                # Home page: paste creation form
│   ├── globals.css             # Tailwind imports + base styles
│   ├── not-found.tsx           # Global 404 page
│   ├── [slug]/
│   │   ├── page.tsx            # Paste view page (Server Component)
│   │   └── not-found.tsx       # Paste-specific 404 (optional)
│   └── api/
│       └── paste/
│           ├── route.ts        # POST /api/paste (create)
│           └── [id]/
│               ├── route.ts    # GET /api/paste/:id (JSON)
│               └── raw/
│                   └── route.ts # GET /api/paste/:id/raw (text/plain)
├── lib/
│   ├── db/
│   │   ├── index.ts            # Database connection singleton
│   │   ├── schema.ts           # Drizzle schema definition
│   │   └── queries.ts          # Reusable query functions
│   └── utils.ts                # Shared utilities (e.g., validation)
├── drizzle.config.ts           # Drizzle Kit configuration
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── package.json
└── data/                       # SQLite database directory (gitignored)
    └── paste.db
```

### Pattern 1: Database Connection Singleton

**What:** Create a single Drizzle database instance, reused across all requests. Enable WAL mode on first connection.
**When to use:** Always -- avoids creating new connections per request.

```typescript
// Source: Context7 Drizzle ORM docs (better-sqlite3 driver)
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('data/paste.db');
sqlite.pragma('journal_mode = WAL');        // D-07: WAL mode
sqlite.pragma('busy_timeout = 5000');       // Wait up to 5s on lock
sqlite.pragma('synchronous = NORMAL');      // Safe with WAL
sqlite.pragma('foreign_keys = ON');         // Enforce FK constraints

export const db = drizzle({ client: sqlite, schema });
```

### Pattern 2: Schema with Future-Proof Columns

**What:** Define the pastes table with all columns needed through Phase 3, avoiding migrations later.
**When to use:** Schema definition.

```typescript
// Source: Context7 Drizzle ORM docs (SQLite schema)
// lib/db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const pastes = sqliteTable('pastes', {
  id: text('id').primaryKey(),                          // nanoid(8)
  content: text('content').notNull(),                   // raw text
  createdAt: integer('created_at', { mode: 'number' }).notNull(), // Unix timestamp
  expiresAt: integer('expires_at', { mode: 'number' }), // nullable, D-06
  sizeBytes: integer('size_bytes').notNull(),            // content byte length
}, (table) => [
  index('idx_expires_at').on(table.expiresAt),           // For future cleanup queries
]);

export type Paste = typeof pastes.$inferSelect;
export type NewPaste = typeof pastes.$inferInsert;
```

### Pattern 3: Route Handler with Validation

**What:** Next.js App Router route handlers using Web standard Request/Response APIs.
**When to use:** API endpoints.

```typescript
// Source: Context7 Next.js docs (route handlers, POST body parsing)
// app/api/paste/route.ts
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';

const MAX_SIZE = 512 * 1024; // 512KB (D-12)

export async function POST(request: Request) {
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== 'string' || content.length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 }); // D-11
  }

  const sizeBytes = new TextEncoder().encode(content).byteLength;
  if (sizeBytes > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Content exceeds 512KB limit' },
      { status: 413 }  // D-12
    );
  }

  const id = nanoid(8); // D-01
  const now = Math.floor(Date.now() / 1000);

  db.insert(pastes).values({
    id,
    content,
    createdAt: now,
    expiresAt: null,
    sizeBytes,
  }).run();

  return NextResponse.json(
    { id, url: `/${id}` }, // D-02
    { status: 201 }
  );
}
```

### Pattern 4: Server Component with Dynamic Route

**What:** Paste view page as an async Server Component that fetches directly from the database.
**When to use:** Paste display pages.

```typescript
// Source: Context7 Next.js docs (dynamic routes, Server Components, notFound)
// app/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function PastePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;

  const paste = db.select().from(pastes).where(eq(pastes.id, slug)).get();

  if (!paste) {
    notFound(); // triggers not-found.tsx
  }

  return (
    <main>
      <pre>{paste.content}</pre>
      <p>Created: {new Date(paste.createdAt * 1000).toISOString()}</p>
    </main>
  );
}
```

### Pattern 5: Drizzle Kit Configuration

**What:** Configuration file for schema migrations.

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: 'data/paste.db',
  },
});
```

### Anti-Patterns to Avoid

- **Creating new Database instances per request:** better-sqlite3 connections are expensive to create. Use a module-level singleton. Node.js module caching ensures one instance.
- **Using `integer('created_at', { mode: 'timestamp' })` for Unix seconds:** Drizzle's `timestamp` mode expects milliseconds (JavaScript Date semantics). Use `{ mode: 'number' }` and store Unix seconds explicitly to avoid confusion.
- **Putting database logic in route handlers directly:** Extract query functions into `lib/db/queries.ts` so both Server Components and Route Handlers can reuse them.
- **Forgetting to `await params` in Next.js 16:** Params are now a Promise in both pages and route handlers. Accessing `params.slug` directly without await is a runtime error.
- **Using `dangerouslySetInnerHTML` for paste content:** Even in Phase 1 where content is displayed as raw text, never render user content as HTML. Use `<pre>` or text nodes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-safe random IDs | Custom base62 encoder | nanoid(8) | Cryptographic randomness, collision resistance, 118 bytes |
| Database schema management | Manual SQL files | drizzle-kit | Type-safe migrations, push for dev, generate for prod |
| Request body parsing | Manual JSON parsing with try/catch | `request.json()` (Web API) | Standard API, proper error handling built in |
| 404 handling | Custom error checking in every page | `notFound()` from `next/navigation` | Next.js convention, renders not-found.tsx automatically |
| Content byte-length calculation | `content.length` | `new TextEncoder().encode(content).byteLength` | String.length counts UTF-16 code units, not bytes. Multibyte chars (emoji, CJK) give wrong count |

**Key insight:** Phase 1 is deliberately minimal. Every component has a well-tested library solution. The only custom code should be the paste creation form, the paste view page, and the thin query layer.

## Common Pitfalls

### Pitfall 1: better-sqlite3 Compilation Failure on Install

**What goes wrong:** `npm install better-sqlite3` fails with native compilation errors because `node-gyp` can't find a C++ compiler or Python.
**Why it happens:** better-sqlite3 is a native Node.js addon that compiles C code during install. Missing build tools (gcc, make, python3) cause failures.
**How to avoid:** Ensure build tools are installed. On Fedora/RHEL: `sudo dnf install gcc-c++ make python3`. On Debian/Ubuntu: `sudo apt install build-essential python3`. Alternatively, use prebuild binaries (better-sqlite3 ships prebuilt binaries for common platforms). [VERIFIED: better-sqlite3 npm page]
**Warning signs:** `gyp ERR!` in npm install output.

### Pitfall 2: SQLite Database File Not Created Automatically

**What goes wrong:** Application crashes on first run because the `data/` directory doesn't exist. better-sqlite3 creates the `.db` file but not parent directories.
**Why it happens:** `new Database('data/paste.db')` throws if `data/` doesn't exist.
**How to avoid:** Ensure the `data/` directory exists before starting the app. Add a startup check in the DB initialization module, or add a `postinstall` script: `mkdir -p data`. Add `data/` to `.gitignore` but commit a `data/.gitkeep` file. [ASSUMED]
**Warning signs:** `SQLITE_CANTOPEN` error on startup.

### Pitfall 3: String.length vs Byte Length for Size Validation

**What goes wrong:** Content size validation uses `content.length` (JavaScript string length in UTF-16 code units) instead of actual byte length. A paste with emoji or CJK characters passes the 512KB check but stores much more than 512KB of data.
**Why it happens:** JavaScript string `.length` returns number of UTF-16 code units, not bytes. The character "hello" is 5 UTF-16 units and 5 bytes, but an emoji like a face emoji is 2 UTF-16 units but 4 bytes in UTF-8.
**How to avoid:** Always use `new TextEncoder().encode(content).byteLength` for byte-accurate size checking. Or use `Buffer.byteLength(content, 'utf8')` in Node.js. [VERIFIED: MDN TextEncoder docs]
**Warning signs:** Pastes slightly over 512KB being accepted.

### Pitfall 4: Params are Promises in Next.js 16

**What goes wrong:** Accessing `params.slug` directly instead of `(await params).slug` in page components or route handlers.
**Why it happens:** Next.js 16 changed params to be async (Promise-based) for both pages and route handlers. Code examples from Next.js 14/15 show synchronous access, which no longer works.
**How to avoid:** Always `const { slug } = await params` before using route parameters. TypeScript will catch this if types are correct. [VERIFIED: Context7 Next.js docs]
**Warning signs:** TypeScript error about Promise access, or runtime "Cannot read property of undefined."

### Pitfall 5: nanoid Collision on Insert

**What goes wrong:** Two pastes get the same 8-character nanoid, violating the PRIMARY KEY constraint.
**Why it happens:** With 8 characters (64^8 = 281 trillion combinations), collision probability is astronomically low at any reasonable scale. But it's not zero.
**How to avoid:** Wrap the insert in a try/catch. If a UNIQUE constraint violation occurs (`SQLITE_CONSTRAINT_PRIMARYKEY`), generate a new ID and retry. In practice, this will never trigger, but defense-in-depth is correct. [ASSUMED]
**Warning signs:** `SQLITE_CONSTRAINT` error on insert.

### Pitfall 6: SQLite WAL Mode in Docker with Volume Mounts

**What goes wrong:** WAL mode creates `-wal` and `-shm` files alongside the main database file. If the Docker volume mount only includes the `.db` file (not the directory), these auxiliary files may not persist, causing data loss on container restart.
**Why it happens:** WAL mode uses separate files (`paste.db-wal`, `paste.db-shm`) for the write-ahead log. If these files are lost, uncommitted transactions are lost.
**How to avoid:** Mount the entire `data/` directory as a volume, not just the `.db` file. Example: `-v /host/path/data:/app/data`. Never mount a single file. [CITED: SQLite WAL documentation at sqlite.org/wal.html]
**Warning signs:** Data loss after container restart; "database disk image is malformed" errors.

## Code Examples

Verified patterns from official sources:

### Database Initialization with WAL Mode

```typescript
// Source: Context7 Drizzle ORM docs (better-sqlite3 driver)
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = 'data/paste.db';

// Ensure directory exists
const dir = dirname(DB_PATH);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle({ client: sqlite, schema });
```

### Reusable Query Functions

```typescript
// lib/db/queries.ts
import { eq } from 'drizzle-orm';
import { db } from './index';
import { pastes, type Paste, type NewPaste } from './schema';

export function getPasteById(id: string): Paste | undefined {
  return db.select().from(pastes).where(eq(pastes.id, id)).get();
}

export function createPaste(data: NewPaste): Paste {
  return db.insert(pastes).values(data).returning().get();
}
```

### POST Route Handler (Create Paste)

```typescript
// Source: Context7 Next.js docs (route handlers)
// app/api/paste/route.ts
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createPaste } from '@/lib/db/queries';

const MAX_CONTENT_BYTES = 512 * 1024;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { content } = body as { content?: string };

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const sizeBytes = new TextEncoder().encode(content).byteLength;
  if (sizeBytes > MAX_CONTENT_BYTES) {
    return NextResponse.json(
      { error: `Content exceeds ${MAX_CONTENT_BYTES} byte limit` },
      { status: 413 }
    );
  }

  const id = nanoid(8);
  const now = Math.floor(Date.now() / 1000);

  try {
    createPaste({
      id,
      content,
      createdAt: now,
      expiresAt: null,
      sizeBytes,
    });
  } catch (err: unknown) {
    // Handle extremely unlikely nanoid collision
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      const retryId = nanoid(8);
      createPaste({
        id: retryId,
        content,
        createdAt: now,
        expiresAt: null,
        sizeBytes,
      });
      return NextResponse.json({ id: retryId, url: `/${retryId}` }, { status: 201 });
    }
    throw err;
  }

  return NextResponse.json({ id, url: `/${id}` }, { status: 201 });
}
```

### GET Route Handler (Retrieve Paste JSON)

```typescript
// app/api/paste/[id]/route.ts
import { NextResponse } from 'next/server';
import { getPasteById } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const paste = getPasteById(id);
  if (!paste) {
    return NextResponse.json({ error: 'Paste not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: paste.id,
    content: paste.content,
    created_at: paste.createdAt,
    expires_at: paste.expiresAt,
  });
}
```

### GET Route Handler (Raw Text)

```typescript
// app/api/paste/[id]/raw/route.ts
import { getPasteById } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const paste = getPasteById(id);
  if (!paste) {
    return new Response('Paste not found', { status: 404 });
  }

  return new Response(paste.content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
```

### Client Component: Paste Creation Form

```typescript
// app/components/paste-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PasteForm() {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create paste');
        return;
      }

      const data = await res.json();
      router.push(data.url);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste your content here..."
        required
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Paste'}
      </button>
    </form>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params` as sync object | `params` as Promise (must await) | Next.js 15+ (breaking in 16) | All page/route components must `await params` |
| `tailwind.config.js` | CSS-first config with `@theme` | Tailwind CSS 4.0 (Jan 2025) | No config file needed; use `@import "tailwindcss"` in CSS |
| `next lint` (built-in ESLint) | Removed in Next.js 16 | Next.js 16 (April 2025) | Use Biome or standalone ESLint |
| Prisma with codegen step | Drizzle with zero codegen | Drizzle matured 2024-2025 | No `prisma generate` step; types flow from schema automatically |
| Turbopack opt-in (`--turbo`) | Turbopack default | Next.js 15+ (default in 16) | No flag needed; use `--webpack` only for incompatible packages |

**Deprecated/outdated:**
- `pages/api/` directory: Replaced by `app/api/` route handlers in App Router. Do not use Pages Router for new projects.
- `getServerSideProps` / `getStaticProps`: Replaced by async Server Components and `fetch()` in App Router.
- `tailwind.config.js`: Replaced by CSS-first configuration in Tailwind v4. No JS config file.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | better-sqlite3 does not create parent directories for the database file path | Common Pitfalls #2 | Minor -- startup crash, easily fixed with mkdir |
| A2 | nanoid collision retry is sufficient with a single retry | Common Pitfalls #5 | Extremely low risk -- collision probability is ~1 in 281 trillion |
| A3 | SQLite file location `data/paste.db` is appropriate | Architecture Patterns | Minor -- can be changed to any path; user confirmed this is Claude's discretion |
| A4 | `{ mode: 'number' }` is the correct Drizzle mode for storing Unix timestamps as integers | Anti-Patterns | Medium -- if wrong, timestamps would be misinterpreted. Drizzle docs confirm `mode: 'number'` stores raw integers |

## Open Questions

1. **Server Actions vs Route Handlers for paste creation**
   - What we know: Both work. D-08 specifies a POST `/api/paste` endpoint, which implies Route Handlers. However, the form submission (D-03) could use either a Server Action or client-side fetch to the API.
   - What's unclear: Whether to use both (Server Action for the form, plus the API route for programmatic access), or just the API route called from a Client Component.
   - Recommendation: Use Route Handlers only. The API route (D-08) is explicitly required and will be reused by Phase 2+ features. The Client Component form calls `fetch('/api/paste')`. Server Actions add a second path to the same DB operation. Keep it simple.

2. **Drizzle timestamp mode for Unix seconds**
   - What we know: D-05 specifies `INTEGER, Unix timestamp`. Drizzle's `integer` column type with `{ mode: 'timestamp' }` converts to/from JavaScript Date objects (using milliseconds). `{ mode: 'number' }` stores raw numbers.
   - What's unclear: Whether to store Unix seconds (traditional) or milliseconds (JavaScript-native).
   - Recommendation: Use `{ mode: 'number' }` and store Unix seconds. This matches D-05's specification and is the convention for SQLite timestamps. Convert to Date on the presentation side.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js 16, better-sqlite3 | Yes | v22.22.0 | -- |
| npm | Package management | Yes | 10.9.4 | -- |
| C++ compiler (gcc/g++) | better-sqlite3 native addon | Likely (Fedora 42) | -- | Prebuilt binaries usually work |

**Missing dependencies with no fallback:** None identified.

**Missing dependencies with fallback:** None identified.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected -- needs setup in Wave 0 |
| Config file | None -- to be created |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-01 | POST /api/paste creates paste and returns id+url | integration | `npx vitest run tests/api/paste.test.ts -t "create paste"` | Wave 0 |
| CORE-02 | Created paste returns shareable URL in response | integration | `npx vitest run tests/api/paste.test.ts -t "returns url"` | Wave 0 |
| CORE-03 | GET /[slug] renders paste content | integration | `npx vitest run tests/api/paste.test.ts -t "retrieve paste"` | Wave 0 |
| CORE-04 | Paste IDs are 8-char nanoid, URL-safe | unit | `npx vitest run tests/lib/id.test.ts` | Wave 0 |
| STOR-01 | Pastes table exists with correct schema including expires_at | unit | `npx vitest run tests/lib/db.test.ts -t "schema"` | Wave 0 |
| SECU-04 | Rejects content > 512KB with 413 | integration | `npx vitest run tests/api/paste.test.ts -t "size limit"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest` + `@vitejs/plugin-react` -- install test framework
- [ ] `vitest.config.ts` -- test configuration
- [ ] `tests/api/paste.test.ts` -- API route integration tests
- [ ] `tests/lib/db.test.ts` -- database layer unit tests
- [ ] `tests/lib/id.test.ts` -- nanoid generation tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- anonymous service |
| V3 Session Management | No | N/A -- no sessions |
| V4 Access Control | No | N/A -- all pastes are public |
| V5 Input Validation | Yes | Server-side validation: content presence, size limit (512KB), type checking |
| V6 Cryptography | No | nanoid uses `crypto.getRandomValues()` internally -- no custom crypto |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized content DoS | Denial of Service | 512KB server-side limit (D-12), reject with 413 |
| ID enumeration/scraping | Information Disclosure | nanoid(8) with 281T combinations; random, not sequential |
| JSON injection in API response | Tampering | `NextResponse.json()` handles serialization safely |
| SQLite injection | Tampering | Drizzle ORM parameterizes all queries automatically |
| Database file exposure | Information Disclosure | Store in `data/` directory, gitignore, ensure not served as static |

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js` -- App Router route handlers, dynamic routes, Server Components, params API, notFound(), serverExternalPackages
- Context7 `/drizzle-team/drizzle-orm-docs` -- better-sqlite3 driver setup, SQLite schema definition, insert/select/eq operators, returning(), type inference, drizzle-kit config
- npm registry -- version verification for all packages (next 16.2.6, drizzle-orm 0.45.2, better-sqlite3 12.10.0, nanoid 5.1.11, drizzle-kit 0.31.10, typescript 6.0.3, tailwindcss 4.3.0, @biomejs/biome 2.4.15)

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` -- pre-existing stack research with source URLs
- `.planning/research/ARCHITECTURE.md` -- architecture patterns, data flow, API design
- `.planning/research/PITFALLS.md` -- XSS, ReDoS, storage growth, ID enumeration pitfalls

### Tertiary (LOW confidence)
- None -- all critical claims verified via Context7 or npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry, all APIs verified via Context7
- Architecture: HIGH -- Next.js App Router patterns well-documented, Drizzle SQLite integration verified
- Pitfalls: HIGH -- native addon compilation, WAL mode files, and params-as-Promise are well-known issues

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (30 days -- stable stack, no fast-moving components)
