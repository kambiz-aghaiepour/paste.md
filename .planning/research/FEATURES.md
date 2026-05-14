# Feature Landscape

**Domain:** Web pastebin with Markdown rendering (paste.md)
**Researched:** 2026-05-14
**Confidence:** HIGH (based on analysis of 15+ existing pastebin/snippet-sharing products)

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Create paste and get shareable URL** | Core function of any pastebin. Without this, the product doesn't exist. | Low | Short, memorable URLs (e.g., `paste.md/abc123`). Every competitor has this. |
| **Markdown rendering** | Core differentiator baked into the product name. Users arriving at "paste.md" expect rendered Markdown. | Medium | Must support GFM (GitHub Flavored Markdown): tables, task lists, strikethrough, autolinks. This is the de facto standard (Rentry, MdBin, MarkdownPaste all use GFM). |
| **Syntax highlighting in code blocks** | Every serious pastebin offers this. Pastebin.com paywalls it, which is a common complaint that drove users to alternatives. | Medium | Use Shiki or Prism. MdBin uses Shiki (same as VS Code) for 100+ languages. This is the modern standard. |
| **Raw text view** | Users need to copy the original Markdown source, not the rendered HTML. Standard across all pastebins (raw.pastebin.com, GitHub raw, etc.). | Low | Simple endpoint serving plain text with `text/plain` content type. |
| **No registration required** | Anonymous-first is table stakes for pastebins. Rentry, MdBin, PrivateBin, Hastebin all work without accounts. Requiring auth (like GitHub Gist) is the minority approach and creates friction. | Low | Already in PROJECT.md as a decision. Correct call. |
| **Live preview while editing** | Every markdown editor offers split-pane or toggle preview. Users will not write Markdown blind. Rentry, MdBin, MarkdownPaste, EDTR.md all have live preview. | Medium | Split-pane (edit left, preview right) is the standard UX pattern. Mobile should stack vertically or toggle between edit/preview. |
| **Responsive design** | Users share paste links in chat/Slack/Discord. Recipients open on phones. If it doesn't render well on mobile, the paste is useless to them. | Medium | Focus on the *reading* experience being responsive. The editor can be desktop-optimized. |
| **Paste expiration options** | Users expect control over paste lifetime. Pastebin.com offers 9 options (10min to 1 year). PrivateBin and Rentry offer similar. "Never expire" should be an option but not the only one. | Low | Recommended options: 1 hour, 1 day, 1 week, 1 month, never. Keep it simple. Server-side TTL cleanup. |
| **Copy button on code blocks** | Standard UX in any rendered Markdown with code. GitHub, MdBin (via Streamdown), and every modern docs site has this. Users will look for it and be annoyed if missing. | Low | Click-to-copy on each fenced code block in the rendered view. |
| **Clean, minimal UI** | Users choosing a pastebin over Google Docs or Notion want speed and simplicity. Pastebin.com's ad-heavy UI is the #1 complaint driving users to alternatives. | Low | Already in PROJECT.md constraints. No ads, no clutter, no sidebar noise. |

## Differentiators

Features that set paste.md apart. Not expected, but valued. These create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Mermaid diagram rendering** | Very few pastebins render diagrams. MdBin added it recently. Turns paste.md from "Markdown renderer" into "documentation sharing tool." Huge for technical users. | Medium | Render `mermaid` code blocks as SVG diagrams. Mermaid.js is the standard library. Load lazily since most pastes won't use it. |
| **KaTeX math rendering** | Almost no pastebins support LaTeX math. PasteMD (gareth618) and EDTR.md do, but they're niche tools. Valuable for academic/scientific users sharing equations. | Medium | Support `$inline$` and `$$block$$` math syntax. KaTeX is faster than MathJax and preferred for web. |
| **Table of contents generation** | Long Markdown documents become hard to navigate without a TOC. Some editors (AI225, 968T) support `[TOC]` syntax. | Low | Auto-generate from headings. Can be a sidebar or inline element. Great for documentation-style pastes. |
| **Dark mode** | Pastebin added Night Mode as a feature. Most modern tools default to respecting `prefers-color-scheme`. Users sharing pastes late at night will appreciate it. | Low | Respect system preference, allow manual toggle. Store preference in localStorage. |
| **Custom paste URLs** | Rentry's killer feature. `paste.md/my-project-docs` is far more memorable than `paste.md/x7f3k2`. Drives repeat usage. | Low | Let users optionally specify a slug. Validate for uniqueness and character safety. Reserve common words. |
| **Embed snippet (iframe/oEmbed)** | GitHub Gist's embed is widely used in blogs and docs. Letting users embed a rendered paste in their site extends reach. Few pastebins offer this. | Medium | Provide an `<iframe>` embed code and/or oEmbed endpoint. Render a minimal, chrome-free version for embedding. |
| **CLI / API for paste creation** | Power users want to pipe output directly: `cat README.md | paste.md`. Rentry, Pastebin.com, and Pastes.io all offer APIs. Hastebin popularized the keyboard-only workflow. | Medium | Simple REST API: `POST /api/paste` with body content, returns URL. CLI can be a shell alias wrapping curl. |
| **Download/export options** | Rentry offers download as raw text, PDF, or PNG. Useful for users who want to save a rendered version of someone's paste. | Medium | Raw download is trivial. PDF export adds complexity but high value. Start with raw `.md` download; PDF later. |
| **Keyboard shortcuts** | Hastebin's entire UX is keyboard-driven (Ctrl+S to save). Power users expect this. | Low | Ctrl/Cmd+Enter to publish, Ctrl/Cmd+Shift+P to toggle preview, Tab for indentation. |
| **QR code for paste URL** | PrivateBin generates QR codes for paste URLs. Useful for sharing pastes from desktop to mobile in meetings or presentations. | Low | Generate client-side with a QR library. Show on demand, not by default. |
| **Paste forking/duplication** | GitHub Gist allows forking. "Use this as a template" flow lets users take someone's paste and modify it without affecting the original. | Low | "Fork" or "Edit a copy" button on the view page. Creates a new paste pre-filled with the content. |

## Anti-Features

Features to explicitly NOT build. These add complexity without proportional value, or contradict paste.md's positioning.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User accounts / authentication** | Adds friction that contradicts anonymous-first positioning. GitHub Gist already owns the "authenticated snippets" space. paste.md wins by being zero-friction. | If needed later, use optional accounts (never required). But v1 should be fully anonymous. |
| **Paste editing after creation** | Immutable pastes are simpler to reason about (shared links always show the same content), cheaper to cache, and avoid the complexity of edit codes (Rentry) or version history (Gist). | Offer "fork" instead: create a new paste from existing content. This is simpler and preserves link integrity. |
| **Real-time collaboration** | Google Docs, HackMD, and Notion own this space. Adding CRDT/OT multiplayer editing to a pastebin is enormous complexity for a use case paste.md shouldn't serve. | Stay single-author. If collaboration is needed, users can fork pastes. |
| **End-to-end encryption** | PrivateBin owns the encrypted-paste niche. E2E encryption makes server-side rendering impossible, breaking the core Markdown rendering value prop. Encrypted content can't be previewed, cached, or SEO-indexed. | If privacy matters, pastes are already unlisted (unguessable URLs). Don't store sensitive data in a pastebin. |
| **File/image upload** | Turns a pastebin into a file hosting service with abuse potential, storage costs, and content moderation headaches. SuperBin and Dustebin do this but it's a different product. | Support Markdown image syntax linking to external URLs. Don't host images. |
| **Social features (comments, likes, followers)** | Pastebin is not a social network. Comments invite spam and moderation burden. Likes add nothing to a sharing tool. | If feedback is needed, users share the paste link in their actual communication channel (Slack, Discord, email). |
| **Execution / online IDE** | Ideone and CodePen let you run code. This is a fundamentally different product with massive security implications (sandboxing, compute costs). | paste.md renders Markdown. It doesn't execute anything. Code blocks are for reading, not running. |
| **Paste search / discovery / trending** | Public paste discovery invites abuse (leaked credentials, spam, illegal content). Pastebin.com's "trending" feature is a security nightmare cited by cybersecurity researchers. | All pastes are unlisted. Discoverable only by the person who has the link. |
| **Monetization features (ads, premium tiers, paywalls)** | Pastebin.com's ads and paywalled syntax highlighting are the #1 reason users seek alternatives. paste.md should not repeat this mistake. | Keep it free and clean. Monetize through optional donations or sponsorships if needed, never ads or feature paywalls. |
| **Password-protected pastes** | Adds complexity to the sharing flow (now you need to communicate a password separately). PrivateBin does this well already. Contradicts the "zero friction" goal. | Unlisted URLs with unguessable IDs provide adequate privacy for the use case. |

## Feature Dependencies

```
Create paste + shareable URL
    |
    +---> Markdown rendering (GFM)
    |       |
    |       +---> Syntax highlighting (code blocks)
    |       +---> Mermaid diagrams (code blocks with lang=mermaid)
    |       +---> KaTeX math ($ and $$ syntax)
    |       +---> Table of contents (generated from headings)
    |       +---> Copy button on code blocks
    |
    +---> Raw text view
    |       |
    |       +---> Download/export (raw .md file)
    |
    +---> Live preview (requires Markdown rendering pipeline in browser)
    |
    +---> Paste expiration (requires server-side cleanup job)
    |
    +---> Custom paste URLs (requires uniqueness validation)
    |
    +---> Embed snippet (requires chrome-free render view)
    |
    +---> CLI/API (requires paste creation endpoint, independent of UI)
    |
    +---> Paste forking (requires pre-filled editor, depends on raw text retrieval)
    |
    +---> Dark mode (independent, CSS-only, no dependencies)
    |
    +---> QR code (independent, client-side generation from paste URL)
    |
    +---> Keyboard shortcuts (independent, thin layer over existing actions)
    |
    +---> Responsive design (cross-cutting, affects all views)
```

Key dependency insight: The Markdown rendering pipeline is the critical path. Everything downstream of it (syntax highlighting, Mermaid, KaTeX, TOC, copy buttons) depends on the renderer being solid. Choose and configure the renderer first, then layer features on top.

## MVP Recommendation

**Prioritize (Phase 1 - Core):**
1. Create paste and get shareable URL (the product)
2. Markdown rendering with GFM support (the differentiator)
3. Syntax highlighting in code blocks (table stakes)
4. Live preview while editing (table stakes for Markdown editors)
5. Raw text view (simple, expected)
6. Clean, minimal UI (brand identity)
7. Responsive design (recipients open links on phones)

**Phase 2 - Polish:**
1. Paste expiration options (important for trust/storage)
2. Dark mode (low effort, high user satisfaction)
3. Copy button on code blocks (small UX detail, big impact)
4. Custom paste URLs (Rentry-style, low complexity, high value)
5. Keyboard shortcuts (power user delight)

**Phase 3 - Power Features:**
1. Mermaid diagram rendering (differentiator)
2. KaTeX math rendering (differentiator)
3. Table of contents generation (differentiator)
4. CLI/API for paste creation (power user acquisition)
5. Paste forking/duplication (community engagement)

**Defer (Phase 4+):**
- Embed snippet / oEmbed (nice-to-have, not critical early)
- QR code generation (niche use case)
- Download/export to PDF (complex, low urgency)

**Explicitly never build:**
- User accounts, real-time collaboration, E2E encryption, file uploads, social features, code execution, paste discovery/trending, ads/paywalls, password protection

## Competitive Positioning

| Feature | Pastebin.com | GitHub Gist | Rentry | MdBin | PrivateBin | **paste.md** |
|---------|-------------|-------------|--------|-------|-----------|-------------|
| No account needed | Yes | **No** | Yes | Yes | Yes | **Yes** |
| Markdown rendering | No | Yes | Yes | Yes | No | **Yes** |
| Syntax highlighting | Paywalled | Yes | No | Yes | No | **Yes (free)** |
| Live preview | No | No | Yes | No | No | **Yes** |
| Mermaid diagrams | No | No | No | Yes | No | **Yes** |
| Math (KaTeX) | No | No | No | No | No | **Yes** |
| Custom URLs | No | No | Yes | No | No | **Yes** |
| Ad-free | **No** | Yes | Yes | Yes | Yes | **Yes** |
| Immutable pastes | No | No | No | Yes | Yes | **Yes** |
| Dark mode | Yes | Yes | No | No | No | **Yes** |
| CLI/API | Yes | Yes | Yes | No | No | **Yes** |

paste.md's unique position: the only tool combining zero-friction anonymous access + full GFM rendering + live preview + syntax highlighting + diagrams/math -- all free and ad-free.

## Sources

- [Pastebin alternatives comparison (snappify)](https://snappify.com/blog/best-pastebin-alternatives)
- [Pastebin alternatives (AlternativeTo)](https://alternativeto.net/software/pastebin/)
- [MdBin - Markdown Pastebin](https://blog.sivaramp.com/blog/introducing-mdbin/)
- [MdBin Streamdown upgrade (DEV)](https://dev.to/sivarampg/mdbin-levels-up-from-custom-markdown-pipeline-to-streamdown-55g2)
- [Rentry.co](https://rentry.co/)
- [Rentry CLI (GitHub)](https://github.com/radude/rentry)
- [MarkdownPaste.com](https://www.markdownpaste.com/about)
- [NoPaste - client-side storage (GitHub)](https://github.com/bokub/nopaste)
- [PrivateBin](https://privatebin.info/)
- [Pastebin.com API docs](https://pastebin.com/doc_api)
- [Pastebin.com FAQ (rate limiting)](https://pastebin.com/faq)
- [Opengist - self-hosted (GitHub)](https://github.com/thomiceli/opengist)
- [PasteMD (GitHub)](https://github.com/gareth618/pastemd)
- [Pastebin alternatives (s.ee)](https://s.ee/blog/best-pastebin-alternatives/)
- [EDTR.md - Markdown editor](https://edtr.md/)
