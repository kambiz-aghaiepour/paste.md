# Requirements: paste.md

**Defined:** 2026-05-14
**Core Value:** Users can quickly paste Markdown content and get a shareable link that renders it beautifully — zero friction from paste to share.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core

- [x] **CORE-01**: User can create a paste by entering text content and submitting
- [x] **CORE-02**: User receives a unique, shareable URL after creating a paste
- [x] **CORE-03**: User can view a paste by visiting its URL
- [x] **CORE-04**: Paste URLs use short, unguessable, random slugs (nanoid)

### Rendering

- [x] **REND-01**: Paste content is rendered as GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks)
- [x] **REND-02**: Code blocks in pastes display with syntax highlighting for 100+ languages
- [x] **REND-03**: User sees a real-time Markdown preview while typing in the editor
- [x] **REND-04**: User can toggle between rendered view and raw Markdown source on a paste page

### Editor

- [x] **EDIT-01**: Editor provides a clean textarea for entering Markdown content
- [x] **EDIT-02**: Editor persists content to localStorage to prevent accidental loss
- [x] **EDIT-03**: Editor supports split-pane layout (edit left, preview right) on desktop

### Security

- [x] **SECU-01**: Rendered Markdown output is sanitized to prevent XSS attacks
- [ ] **SECU-02**: Application serves strict Content Security Policy headers
- [ ] **SECU-03**: Paste creation is rate-limited per IP address
- [x] **SECU-04**: Paste content size is limited (max 512KB)

### Storage

- [x] **STOR-01**: Pastes are stored in SQLite with schema including expiration support
- [x] **STOR-02**: User can select paste expiration when creating (1 hour, 1 day, 1 week, 1 month, never)
- [x] **STOR-03**: Expired pastes return 410 Gone status
- [x] **STOR-04**: Background cleanup removes expired paste data

### UI

- [x] **UI-01**: Interface is clean, minimal, and ad-free
- [x] **UI-02**: Paste reading experience is fully responsive on mobile devices
- [x] **UI-03**: Code blocks display a copy-to-clipboard button
- [x] **UI-04**: Application supports dark mode (system preference + manual toggle)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Power Features

- **POWR-01**: User can create pastes via CLI/API (`POST /api/paste`)
- **POWR-02**: Mermaid diagram code blocks render as SVG diagrams
- **POWR-03**: KaTeX math expressions render inline and block equations
- **POWR-04**: Long pastes auto-generate a table of contents from headings
- **POWR-05**: User can specify a custom URL slug for their paste
- **POWR-06**: User can fork an existing paste into a new editable paste
- **POWR-07**: Keyboard shortcuts for common actions (Ctrl+Enter to publish, Ctrl+Shift+P to toggle preview)

### Operational

- **OPER-01**: Embed snippet / oEmbed support for embedding pastes in external sites
- **OPER-02**: QR code generation for paste URLs
- **OPER-03**: Download paste as raw .md file
- **OPER-04**: Abuse reporting mechanism

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Contradicts anonymous-first positioning; adds friction |
| Paste editing after creation | Immutable pastes simplify caching and guarantee link stability |
| Real-time collaboration | Massive complexity (CRDT/OT); HackMD/Notion own this space |
| End-to-end encryption | Breaks server-side rendering, the core value proposition |
| File/image upload | Abuse magnet, storage costs, content moderation burden |
| Social features (comments, likes) | Not a social network; moderation burden with no proportional value |
| Code execution | Fundamentally different product with major security implications |
| Paste discovery / trending | Security nightmare; invites abuse (leaked credentials, spam) |
| Ads / premium tiers / paywalls | #1 complaint about Pastebin.com; contradicts clean UI positioning |
| Password-protected pastes | Adds friction; unguessable URLs provide adequate privacy |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Complete |
| CORE-02 | Phase 1 | Complete |
| CORE-03 | Phase 1 | Complete |
| CORE-04 | Phase 1 | Complete |
| REND-01 | Phase 2 | Complete |
| REND-02 | Phase 2 | Complete |
| REND-03 | Phase 2 | Complete |
| REND-04 | Phase 3 | Complete |
| EDIT-01 | Phase 2 | Complete |
| EDIT-02 | Phase 2 | Complete |
| EDIT-03 | Phase 2 | Complete |
| SECU-01 | Phase 2 | Complete |
| SECU-02 | Phase 4 | Pending |
| SECU-03 | Phase 4 | Pending |
| SECU-04 | Phase 1 | Complete |
| STOR-01 | Phase 1 | Complete |
| STOR-02 | Phase 3 | Complete |
| STOR-03 | Phase 3 | Complete |
| STOR-04 | Phase 3 | Complete |
| UI-01 | Phase 5 | Complete |
| UI-02 | Phase 5 | Complete |
| UI-03 | Phase 5 | Complete |
| UI-04 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-05-14*
*Last updated: 2026-05-14 after roadmap creation*
