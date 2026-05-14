# Architecture Patterns

**Domain:** Markdown pastebin web application (paste.md)
**Researched:** 2026-05-14

## Recommended Architecture

paste.md is a read-heavy, anonymous, immutable pastebin with Markdown rendering. The architecture should reflect these properties: simplicity, fast reads, zero-auth, and secure rendering of user-supplied Markdown.

### High-Level Overview

```
 +------------------+       +------------------+       +------------------+
 |                  |       |                  |       |                  |
 |   Browser/Client | ----> |   Web Server     | ----> |   Data Store     |
 |                  |       |   (API + Static) |       |   (SQLite)       |
 |  - Editor UI     | <---- |                  | <---- |                  |
 |  - Live Preview  |       |  - POST /api/paste|      |  - pastes table  |
 |  - Rendered View |       |  - GET  /api/paste|      |  - metadata +    |
 |                  |       |  - GET  /:id      |      |    content       |
 +------------------+       +------------------+       +------------------+
        |                          |
        |                          |
        v                          v
 +------------------+       +------------------+
 |  Markdown        |       |  Rate Limiter    |
 |  Renderer        |       |  (in-memory or   |
 |  (client-side)   |       |   middleware)     |
 +------------------+       +------------------+
```

### Rendering Strategy: Hybrid Approach

**Client-side rendering for the editor/preview.** The live preview feature requires immediate feedback as the user types -- this must happen in the browser. Use an AST-based Markdown library (not string-to-innerHTML) to parse and render Markdown safely.

**Client-side rendering for the read view as well.** For a v1 anonymous pastebin, server-side rendering adds complexity without clear benefit. The paste content is stored as raw Markdown and rendered client-side on retrieval. This keeps the server stateless and simple (it just serves JSON and static files). SEO is not a priority for anonymous, ephemeral paste content.

**Why not server-side rendering for read views?** SSR would improve first-paint for shared links and enable SEO, but paste.md's content is anonymous and ephemeral -- search engine indexing is unnecessary and potentially undesirable. CSR keeps the server thin, avoids server-side Markdown dependency management, and means one rendering pipeline instead of two.

---

## Component Boundaries

| Component | Responsibility | Communicates With | Technology |
|-----------|---------------|-------------------|------------|
| **Editor UI** | Text input, keyboard shortcuts, tab handling | Markdown Renderer (live preview), API Client | Browser JS/Framework |
| **Markdown Renderer** | Parse Markdown to safe HTML, syntax highlighting | Editor UI (preview mode), Paste View | Client-side library (e.g., markdown-it + highlight.js) |
| **Paste View** | Display rendered paste, toggle raw/rendered, share URL | Markdown Renderer, API Client | Browser JS/Framework |
| **API Client** | HTTP calls to backend (create paste, fetch paste) | Web Server API | fetch/axios |
| **Web Server** | Serve static files, handle API routes, rate limiting | Data Store, Rate Limiter | Node.js / Express or similar |
| **API Router** | Route POST/GET requests, validate input, generate IDs | Data Store, ID Generator | Server framework router |
| **ID Generator** | Create short, URL-safe, unique paste identifiers | API Router | nanoid (custom length) |
| **Data Store** | Persist and retrieve paste content + metadata | API Router | SQLite |
| **Rate Limiter** | Throttle paste creation per IP to prevent abuse | Web Server middleware | In-memory or Redis-backed |
| **Sanitization Layer** | Ensure rendered Markdown cannot execute scripts | Markdown Renderer | DOMPurify + CSP headers |

---

## Data Flow

### Create Paste Flow

```
1. User types Markdown in Editor
2. Editor sends content to Markdown Renderer for live preview (client-side only)
3. User clicks "Create" / "Save"
4. API Client sends POST /api/paste { content: "# Hello..." }
5. Web Server validates:
   - Content is present and non-empty
   - Content length is within limit (e.g., 512 KB)
   - Rate limit not exceeded for this IP
6. ID Generator creates a short ID (nanoid, 8 chars)
7. API Router inserts into Data Store:
   - id (primary key)
   - content (raw Markdown text)
   - created_at (timestamp)
   - expires_at (optional, null = never)
8. Server returns { id: "aBc12XyZ", url: "/aBc12XyZ" }
9. Client redirects to the paste view URL
```

### Read Paste Flow

```
1. User visits /<paste_id> (e.g., /aBc12XyZ)
2. Web Server serves the SPA shell (index.html)
3. Client-side router extracts paste ID from URL
4. API Client sends GET /api/paste/<paste_id>
5. Server queries Data Store for paste by ID
   - If not found: return 404
   - If expired: return 410 Gone
   - If found: return { id, content, created_at }
6. Markdown Renderer parses raw content into HTML (client-side)
7. Sanitization Layer (DOMPurify) cleans the output
8. Paste View renders the sanitized HTML
9. User can toggle between rendered view and raw Markdown view
```

### Data Direction Summary

```
WRITE:  Browser --> API Server --> SQLite
READ:   Browser --> API Server --> SQLite --> Browser --> Renderer --> DOM
```

All rendering happens in the browser. The server never interprets or transforms Markdown -- it stores and retrieves raw text.

---

## Data Model

### Pastes Table (SQLite)

```sql
CREATE TABLE pastes (
  id          TEXT PRIMARY KEY,    -- nanoid, 8 chars
  content     TEXT NOT NULL,       -- raw Markdown
  created_at  TEXT NOT NULL,       -- ISO 8601 timestamp
  expires_at  TEXT,                -- ISO 8601 or NULL (never expires)
  size_bytes  INTEGER NOT NULL     -- content length for stats/limits
);

CREATE INDEX idx_pastes_expires ON pastes(expires_at)
  WHERE expires_at IS NOT NULL;
```

**Why a single table with content inline?**

For a small-to-medium pastebin (< 1M pastes), storing content directly in SQLite is simpler and performs well. SQLite handles TEXT columns up to 1 GB. Separating content to filesystem or object storage is an optimization for when you exceed SQLite's practical limits or need CDN-served content. Start simple; extract later if needed.

**Why SQLite?**

- Zero operational overhead (no database server to manage)
- Single-file database, trivially backed up
- Handles the read-heavy workload well with WAL mode
- Sufficient for thousands of concurrent reads
- If the project outgrows it, migration to PostgreSQL is straightforward

---

## API Design

### Endpoints

| Method | Path | Request Body | Response | Purpose |
|--------|------|-------------|----------|---------|
| `POST` | `/api/paste` | `{ content: string, expiresIn?: number }` | `{ id: string, url: string, created_at: string }` | Create a paste |
| `GET` | `/api/paste/:id` | -- | `{ id: string, content: string, created_at: string }` | Retrieve a paste |
| `GET` | `/api/paste/:id/raw` | -- | Plain text (Content-Type: text/plain) | Raw Markdown content |

**No DELETE endpoint for v1.** Pastes are immutable and anonymous -- there is no authenticated owner to authorize deletion. Expiration handles cleanup. A future version could return a "delete token" at creation time.

**No PATCH/PUT.** Immutable pastes by design (per PROJECT.md).

### Response Codes

| Code | Meaning |
|------|---------|
| `201` | Paste created successfully |
| `200` | Paste retrieved |
| `400` | Invalid request (missing content, too large) |
| `404` | Paste not found |
| `410` | Paste expired |
| `429` | Rate limit exceeded |

---

## Paste ID Generation

**Use nanoid with a custom length of 8 characters.**

- 8-char nanoid with default alphabet (A-Za-z0-9_-) = 64^8 = ~281 trillion combinations
- Collision probability is negligible at any reasonable scale
- URL-friendly by default (no encoding needed)
- Cryptographically secure random generation
- 118 bytes total package size
- No need for a Key Generation Service at this scale -- generate-and-insert with a unique constraint on the `id` column handles the astronomically unlikely collision via retry

**Why not UUID?** UUIDs are 36 characters -- too long for shareable paste URLs. The entire point of a pastebin URL is to be short and copyable.

**Why not sequential/auto-increment?** Predictable IDs allow enumeration of all pastes. For an anonymous service, this is a privacy concern. Random IDs prevent scraping.

---

## Security Architecture

### Markdown XSS Prevention (CRITICAL)

This is the single most important security concern for a Markdown pastebin. User-supplied Markdown is rendered to HTML in the browser, which is a direct XSS vector.

**Defense in depth (all layers required):**

1. **AST-based renderer:** Use a Markdown library that converts to an AST and renders via DOM APIs, not innerHTML. Libraries like `markdown-it` produce HTML strings, so they require additional sanitization. Libraries like `react-markdown` (if using React) render via `createElement` and are safer by default.

2. **DOMPurify sanitization:** After Markdown-to-HTML conversion, pass output through DOMPurify before inserting into the DOM. This strips `<script>` tags, `javascript:` URIs, event handler attributes (`onerror`, `onclick`), and other dangerous constructs.

3. **Disable raw HTML in Markdown parser:** Configure the Markdown parser to escape or strip any inline HTML in the source. Markdown allows `<script>` and `<iframe>` in raw HTML blocks by default -- this must be disabled.

4. **Content Security Policy headers:** Set strict CSP headers on all responses:
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src *; connect-src 'self'
   ```
   This blocks execution of injected scripts even if sanitization has a gap.

5. **URL protocol filtering:** Block `javascript:`, `vbscript:`, and `data:` URI schemes in Markdown links and images.

### Rate Limiting

- **Creation:** Max 10 pastes per IP per hour (generous for legitimate use, blocks spam bots)
- **Retrieval:** Higher limit or none (reads are cheap, pastes are meant to be shared)
- **Implementation:** In-memory rate limiter (express-rate-limit or similar) is sufficient for a single-server deployment. No need for Redis unless scaling horizontally.

### Content Size Limits

- **Max paste size:** 512 KB of raw Markdown text
- **Enforce server-side:** Reject at the API layer before touching the database
- **Enforce client-side:** Prevent submission and show a warning in the editor

---

## Patterns to Follow

### Pattern 1: Separation of Raw Storage and Rendered Output

**What:** Store only raw Markdown text. Never store rendered HTML. Render on demand client-side.

**Why:** Changing the Markdown renderer or fixing a rendering bug automatically applies to all existing pastes. No data migration needed. Storage is smaller (no HTML bloat). No risk of stored XSS in the database.

**Example:**
```typescript
// Server stores raw text
await db.run('INSERT INTO pastes (id, content, ...) VALUES (?, ?, ...)', [id, rawMarkdown]);

// Client renders on retrieval
const response = await fetch(`/api/paste/${id}`);
const { content } = await response.json();
const html = markdownRenderer.render(content);
const clean = DOMPurify.sanitize(html);
document.getElementById('output').innerHTML = clean;
```

### Pattern 2: Static Shell + API Data

**What:** Serve a single static HTML/JS/CSS bundle. All paste data flows through the JSON API. The server does not render HTML templates per-paste.

**Why:** Clear separation between static assets (cacheable forever with content hashing) and dynamic data (API responses). Simplifies deployment -- the server is a static file server plus a small API. Frontend and backend can evolve independently.

### Pattern 3: Progressive Enhancement for the Editor

**What:** Build the editor in stages: (1) plain textarea, (2) add live preview, (3) add syntax highlighting in the editor itself, (4) add keyboard shortcuts.

**Why:** The core product works with just a textarea and a submit button. Every enhancement is additive. This maps directly to build phases and avoids blocking launch on editor polish.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server-Side Markdown Rendering for Anonymous Content

**What:** Rendering user Markdown on the server and serving pre-built HTML.

**Why bad:** Adds a Markdown dependency to the server (attack surface), requires HTML sanitization on the server (complexity), means you store or cache rendered HTML (storage bloat, stale renders when you update the renderer), and for anonymous ephemeral content, SEO is not a benefit.

**Instead:** Render client-side. The server stores and serves raw text only.

### Anti-Pattern 2: Building a Custom Markdown Parser

**What:** Writing your own Markdown-to-HTML converter.

**Why bad:** Markdown has many edge cases (CommonMark spec is 30+ pages). Every edge case you miss is a potential XSS vector or rendering bug. Battle-tested libraries have years of security fixes.

**Instead:** Use markdown-it (most popular, extensible, CommonMark-compliant) or a framework-integrated option.

### Anti-Pattern 3: Predictable Sequential Paste IDs

**What:** Using auto-incrementing integers (1, 2, 3...) as paste IDs.

**Why bad:** Allows enumeration of all pastes. Anyone can iterate through every paste ever created. For an anonymous service, this is a critical privacy violation.

**Instead:** Use random IDs (nanoid) that are not guessable.

### Anti-Pattern 4: No Content Size Limit

**What:** Accepting arbitrarily large paste content.

**Why bad:** A single malicious user can exhaust disk space or cause denial of service. Rendering extremely large Markdown documents can freeze the browser.

**Instead:** Enforce a 512 KB limit server-side. Display a character/size counter in the editor.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Database** | SQLite single file, no issues | SQLite with WAL mode, still fine | Migrate to PostgreSQL, add read replicas |
| **Storage** | All in SQLite (~50 MB) | SQLite (~5 GB) | Separate content to S3/object storage |
| **Read performance** | Direct DB reads | Add in-memory cache (LRU) for hot pastes | CDN for static assets + API cache layer |
| **Rate limiting** | In-memory per-process | In-memory still works (single server) | Redis-backed rate limiting across instances |
| **Rendering** | Client browser handles it | No server change needed | No server change needed (client-side) |
| **Deployment** | Single process, single server | Single server still works | Multiple server instances behind load balancer |

paste.md at v1 targets the "100 users" column. Architecture decisions should not preclude moving right, but optimizing for the right column prematurely is wasted effort.

---

## Suggested Build Order

Components have dependencies. Build in this order to always have a working (if minimal) system.

### Phase 1: Core Data Path (must be first)

Build the minimum end-to-end flow:

1. **Data Store** -- SQLite schema, connection setup
2. **ID Generator** -- nanoid integration
3. **API Router** -- POST and GET endpoints
4. **Web Server** -- Express/Fastify serving the API

At the end of this phase: you can create and retrieve pastes via curl/Postman.

### Phase 2: Basic UI (depends on Phase 1)

Build the frontend that uses the API:

1. **Editor UI** -- Plain textarea with a "Create" button
2. **API Client** -- fetch calls to POST/GET
3. **Paste View** -- Display raw paste content (no rendering yet)
4. **Client-side routing** -- Handle `/:id` URLs

At the end of this phase: functional pastebin with no Markdown rendering.

### Phase 3: Markdown Rendering (depends on Phase 2)

Add the core differentiator:

1. **Markdown Renderer** -- Integrate markdown-it (or equivalent)
2. **Syntax Highlighting** -- Add highlight.js for code blocks
3. **Sanitization Layer** -- DOMPurify integration
4. **Live Preview** -- Split-pane or toggle preview in editor
5. **Raw/Rendered Toggle** -- Switch between views on paste page

At the end of this phase: the core product is complete.

### Phase 4: Hardening (depends on Phase 3)

Production readiness:

1. **Rate Limiter** -- Per-IP throttling on paste creation
2. **Content Size Limits** -- Server and client validation
3. **CSP Headers** -- Security headers on all responses
4. **Error Handling** -- Graceful 404, 410, 429 pages
5. **Expiration Cleanup** -- Background job to delete expired pastes

### Phase 5: Polish (depends on Phase 4)

User experience refinements:

1. **Responsive design** -- Mobile-friendly editor and viewer
2. **Copy-to-clipboard** -- For paste URL and raw content
3. **Keyboard shortcuts** -- Tab indent, Ctrl+S to save
4. **Loading states** -- Skeleton/spinner while fetching
5. **Accessibility** -- ARIA labels, focus management, screen reader testing

---

## Sources

- [System Design Primer - Pastebin](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md) -- Reference architecture, data model, scaling considerations (HIGH confidence)
- [System Design Handbook - Design Pastebin](https://www.systemdesignhandbook.com/guides/design-pastebin/) -- Component breakdown, API design, caching strategy (HIGH confidence)
- [Haste Server (GitHub)](https://github.com/shykes/haste-server) -- Open-source Node.js pastebin with pluggable storage backends (HIGH confidence)
- [mdbin (GitHub)](https://github.com/kevinfiol/mdbin) -- Self-hostable Markdown pastebin, minimal architecture reference (MEDIUM confidence)
- [PasteMD (GitHub)](https://github.com/gareth618/pastemd) -- Vue/Nuxt Markdown pastebin with Firebase (MEDIUM confidence)
- [Showdown Wiki - Markdown XSS](https://github.com/showdownjs/showdown/wiki/Markdown's-XSS-Vulnerability-(and-how-to-mitigate-it)) -- XSS vectors in Markdown rendering (HIGH confidence)
- [HackerOne - Secure Markdown Rendering in React](https://www.hackerone.com/blog/secure-markdown-rendering-react-balancing-flexibility-and-safety) -- Sanitization best practices (HIGH confidence)
- [nanoid (GitHub)](https://github.com/ai/nanoid) -- URL-friendly ID generator, benchmarks, collision analysis (HIGH confidence)
- [System Design School - Pastebin](https://systemdesignschool.io/problems/pastebin/solution) -- API design, key generation approaches (MEDIUM confidence)
- [web.dev - Rendering on the Web](https://web.dev/articles/rendering-on-the-web) -- CSR vs SSR tradeoffs (HIGH confidence)
