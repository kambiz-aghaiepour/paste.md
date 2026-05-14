# Roadmap: paste.md

## Overview

paste.md goes from zero to a production-ready anonymous Markdown pastebin in five phases. Phase 1 establishes the data path (create, store, retrieve pastes). Phase 2 adds the core differentiator: Markdown rendering with syntax highlighting and a live-preview editor. Phase 3 completes the paste lifecycle with expiration controls and view modes. Phase 4 hardens the service for public use with CSP headers and rate limiting. Phase 5 polishes the interface with responsive design, dark mode, and quality-of-life features.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Data Path** - Create, store, and retrieve pastes via unique URLs with SQLite storage
- [ ] **Phase 2: Markdown Rendering & Editor** - Render GFM with syntax highlighting and provide a live-preview editor
- [ ] **Phase 3: Paste Lifecycle** - Expiration controls, expired paste handling, background cleanup, and raw view toggle
- [ ] **Phase 4: Security Hardening** - CSP headers and rate limiting for public deployment
- [ ] **Phase 5: UI Polish & Experience** - Clean responsive interface with dark mode and quality-of-life features

## Phase Details

### Phase 1: Foundation & Data Path
**Goal**: Users can create a paste and access it via a unique shareable URL, backed by persistent SQLite storage
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, STOR-01, SECU-04
**Success Criteria** (what must be TRUE):
  1. User can enter text content on the home page, submit it, and receive a unique URL
  2. User can visit a paste URL and see the stored content displayed
  3. Paste URLs use short random slugs that are not sequential or guessable
  4. Submitting content larger than 512KB is rejected with a clear error message
  5. Pastes persist across server restarts (SQLite storage with expiration column in schema)
**Plans**: 2 plans

Plans:
**Wave 1**
- [x] 01-01-PLAN.md -- Walking Skeleton: scaffold project, data layer, and complete create-view data path

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md -- Automated tests for all requirements and human verification checkpoint

### Phase 2: Markdown Rendering & Editor
**Goal**: Users see beautifully rendered Markdown with syntax-highlighted code blocks, and can preview their paste in real-time while editing
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: REND-01, REND-02, REND-03, EDIT-01, EDIT-02, EDIT-03, SECU-01
**Success Criteria** (what must be TRUE):
  1. Visiting a paste URL renders its Markdown content as formatted HTML (headings, tables, task lists, links all render correctly)
  2. Code blocks in pastes display with language-appropriate syntax highlighting
  3. User sees a live preview of rendered Markdown updating as they type in the editor
  4. Editor content survives accidental page refresh or browser close (localStorage persistence)
  5. On desktop, user can work in a split-pane layout with editor on the left and preview on the right
**Plans**: 3 plans
**UI hint**: yes

Plans:
**Wave 1**
- [x] 02-01-PLAN.md -- Install rendering dependencies, create MarkdownRenderer server component, wire into paste view

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md -- Create custom hooks and preview components, extend editor with split-pane, live preview, mobile toggle, localStorage

**Wave 3** *(blocked on Wave 1 + Wave 2 completion)*
- [x] 02-03-PLAN.md -- Automated tests for rendering pipeline and localStorage, human verification checkpoint

### Phase 3: Paste Lifecycle
**Goal**: Users can control how long their pastes live and view paste content in both rendered and raw formats
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: STOR-02, STOR-03, STOR-04, REND-04
**Success Criteria** (what must be TRUE):
  1. User can select an expiration period (1 hour, 1 day, 1 week, 1 month, never) when creating a paste
  2. Visiting an expired paste URL returns a 410 Gone status with a clear message
  3. User can toggle between rendered Markdown view and raw source view on a paste page
  4. Expired paste data is automatically cleaned up and does not accumulate in the database
**Plans**: 2 plans
**UI hint**: yes

Plans:
**Wave 1**
- [x] 03-01-PLAN.md -- Expiration creation, 410 expired handling, and rendered/raw view toggle

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02-PLAN.md -- Background cleanup endpoint, automated tests, and human verification

### Phase 4: Security Hardening
**Goal**: The service is hardened against common web attacks and abuse before public deployment
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SECU-02, SECU-03
**Success Criteria** (what must be TRUE):
  1. All responses include strict Content Security Policy headers that block inline scripts and unauthorized resource loading
  2. Paste creation is rate-limited per IP address, and exceeding the limit returns a 429 response with a clear message
**Plans**: 2 plans

Plans:
**Wave 1**
- [x] 04-01-PLAN.md -- CSP headers with SRI, supplementary security headers, and rate limiter module with TDD

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 04-02-PLAN.md -- Wire rate limiter into proxy, integration tests, and human verification

### Phase 5: UI Polish & Experience
**Goal**: The interface is clean, responsive, and delightful to use across devices and lighting conditions
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Interface is clean, minimal, and free of ads or visual clutter
  2. Paste reading experience works well on mobile devices (text reflows, code blocks scroll horizontally, no layout breakage)
  3. Code blocks display a copy-to-clipboard button that copies the code content on click
  4. Application supports dark mode via system preference detection and a manual toggle
**Plans**: 2 plans
**UI hint**: yes

Plans:
**Wave 1**
- [x] 05-01-PLAN.md -- Dark mode infrastructure, theme toggle, Shiki dual themes, and visual cleanup across all components

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 05-02-PLAN.md -- Copy-to-clipboard on code blocks, mobile responsiveness, automated tests, and human verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Data Path | 2/2 | Complete | - |
| 2. Markdown Rendering & Editor | 3/3 | Complete |  |
| 3. Paste Lifecycle | 2/2 | Complete |  |
| 4. Security Hardening | 2/2 | Complete | - |
| 5. UI Polish & Experience | 0/2 | Not started | - |
