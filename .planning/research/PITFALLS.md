# Domain Pitfalls

**Domain:** Web pastebin with Markdown rendering (paste.md)
**Researched:** 2026-05-14

## Critical Pitfalls

Mistakes that cause security incidents, rewrites, or service-level failures.

### Pitfall 1: XSS via Unsanitized Markdown Output

**What goes wrong:** Markdown-to-HTML conversion preserves or generates dangerous HTML. The Markdown spec actively encourages inline HTML, meaning raw user input like `[click](javascript:alert('XSS'))`, `<img src=x onerror=alert(1)>`, or `<iframe src="evil.com">` passes straight through to rendered output. Pastebin.com itself was vulnerable to this exact attack (disclosed 2017, patched 2018). Reddit's new interface was also affected.

**Why it happens:** Developers assume Markdown is "safe" because it looks like plain text. They sanitize input before parsing (which Markdown's own transformations bypass) or skip sanitization entirely, trusting the parser to be safe. Most Markdown parsers (marked, showdown, markdown-it) do NOT sanitize by default -- they faithfully render inline HTML as-is.

**Consequences:** Stored XSS -- every visitor to a malicious paste executes attacker-controlled JavaScript. Cookie theft, session hijacking, credential phishing via embedded iframes, defacement. This is the single highest-severity vulnerability for a pastebin.

**Prevention:**
1. Sanitize OUTPUT, never input. Run sanitization after Markdown-to-HTML conversion, not before.
2. Use a component-based renderer (react-markdown) that converts Markdown to AST then to React elements, bypassing `dangerouslySetInnerHTML` entirely.
3. If raw HTML must be supported, add rehype-sanitize in the remark/rehype pipeline or DOMPurify as a final pass.
4. Filter dangerous URI schemes (`javascript:`, `vbscript:`, `data:`) in links and images. react-markdown does this by default via `uriTransformer`, but custom overrides disable it.
5. Deploy a strict Content Security Policy header: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; frame-ancestors 'none'`. This is a defense-in-depth layer -- CSP blocks script execution even if sanitization has a gap.
6. Never use `unsafe-inline` or `unsafe-eval` in CSP directives.

**Detection:** Automated XSS testing with known Markdown payloads (see github.com/cujanovic/Markdown-XSS-Payloads). Test during CI with a payload suite. Monitor CSP violation reports in production.

**Phase:** Must be addressed in Phase 1 (MVP). Security is not a feature you bolt on later. The Markdown rendering pipeline should be secure from the first line of code.

**Confidence:** HIGH -- multiple CVEs, documented real-world exploits on Pastebin.com and Reddit.

---

### Pitfall 2: ReDoS (Regular Expression Denial of Service) in Markdown Parsers

**What goes wrong:** Crafted Markdown input triggers catastrophic backtracking in regex patterns used by the parser, consuming 100% CPU and hanging the server or browser tab. A 58-byte document can block a parser for 6+ seconds, with exponential growth per additional byte pair.

**Why it happens:** Markdown parsers rely heavily on complex regular expressions. Overlapping alternatives in regex patterns (e.g., `(A|B)*` where a sequence can match either branch) create exponential backtracking on adversarial input. Nearly every major JS Markdown library has had at least one ReDoS CVE:
- **marked** (CVE-2015-8854) -- em inline rule
- **markdown-it** (CVE-2022-21670) -- newline rule, quadratic on `_*...` patterns
- **markdown-to-jsx** -- BREAK_THEMATIC_R regex
- **CodeMirror** (CVE-2025-6493) -- markdown mode
- **mistune** (Python, CVE-2026-33079) -- LINK_TITLE_RE

**Consequences:** Server-side: a single malicious paste creation request takes down the API for seconds to minutes. Client-side: the real-time preview tab freezes, degrading UX. At scale, a handful of crafted requests can DoS the entire service.

**Prevention:**
1. Pin Markdown library versions and subscribe to security advisories (Snyk, GitHub Dependabot).
2. Enforce a maximum paste size (e.g., 256KB). This limits the attack surface for ReDoS since payload effectiveness scales with input length.
3. If rendering server-side, add a parsing timeout (e.g., 5-second hard limit) and return an error if exceeded.
4. Prefer parsers with strong ReDoS track records. markdown-it has patched multiple ReDoS issues and has an active security response. Avoid unmaintained parsers like markdown-js.
5. For the real-time preview editor, debounce parsing and consider running the parser in a Web Worker so a freeze doesn't lock the main thread.

**Detection:** Monitor server response times for paste creation and rendering endpoints. Alert on P99 latency spikes. Test with known ReDoS payloads during CI.

**Phase:** Phase 1 (MVP) for library selection and paste size limits. Phase 2 for Web Worker isolation of the preview parser.

**Confidence:** HIGH -- documented CVEs across every major Markdown library.

---

### Pitfall 3: Unbounded Storage Growth Without Expiration

**What goes wrong:** Anonymous pastes accumulate indefinitely. With no authentication barrier, bots and bulk uploaders can create thousands of pastes per hour. Storage grows linearly and never shrinks. At 10KB average per paste, 10,000 pastes/day = 100MB/day = 36GB/year. That is manageable, but abuse can spike this 100x.

**Why it happens:** Expiration feels like a "nice to have" during MVP. Developers defer it, then discover that retroactively adding expiration to existing pastes is socially and technically awkward (breaking existing shared links). The cleanup job is also non-trivial -- naive database scans for expired rows under load can degrade performance.

**Consequences:** Storage costs grow unbounded. Database queries slow as table size increases. The service becomes a dumping ground for spam, malware hosting, and data exfiltration (threat actors actively use anonymous pastebins as C2 channels and data drops).

**Prevention:**
1. Design expiration into the schema from day one. Every paste gets a `created_at` and `expires_at` column. Default expiration: 30 days for anonymous pastes.
2. Offer user-selectable expiration tiers: 10 minutes, 1 hour, 1 day, 1 week, 30 days, never (if ever added for authenticated users).
3. Implement lazy expiration at read time: check `expires_at` before serving, return 410 Gone if expired. This is cheap and immediate.
4. Add a background cleanup job that runs during low-traffic periods to hard-delete expired content. Batch deletes, don't delete row-by-row.
5. Set a maximum paste size (256KB is generous for Markdown text).

**Detection:** Monitor total paste count and storage size. Alert on growth rate anomalies.

**Phase:** Phase 1 (MVP). The schema must include expiration fields from the start, even if the cleanup job is deferred to Phase 2.

**Confidence:** HIGH -- standard system design knowledge, confirmed by every pastebin system design analysis.

---

### Pitfall 4: Abuse as a Malware/Spam/Data-Exfiltration Platform

**What goes wrong:** Anonymous pastebins are actively targeted by threat actors. They host malware payloads, phishing pages (rendered Markdown can look very convincing), stolen credential dumps, spam link farms for SEO, and C2 command channels. Your service gets flagged by Google Safe Browsing, blacklisted by corporate firewalls, or receives DMCA takedown notices.

**Why it happens:** Zero-friction anonymous creation is both the product's value proposition and its attack surface. Without authentication, there is no accountability. Without content moderation, there is no defense.

**Consequences:** Domain reputation destruction (Google Safe Browsing flags your domain, browser warnings scare away legitimate users). Legal liability for hosted content (DMCA, CSAM reporting obligations, data protection laws). Infrastructure abuse (bandwidth, storage). Potential service termination by hosting providers.

**Prevention:**
1. Rate limit paste creation aggressively: IP-based, 10-20 pastes per hour per IP for anonymous users.
2. Implement basic content heuristics: reject pastes that are predominantly URLs (link farms), contain known malware signatures, or match patterns of credential dumps (email:password lists).
3. Add a "Report Abuse" mechanism on every paste view page. This is both a legal requirement for DMCA safe harbor and a practical moderation tool.
4. Set up a DMCA policy page and designated agent. Required for safe harbor protection under 17 U.S.C. 512.
5. Add `robots.txt` restrictions to prevent search engine indexing of paste content (reduces SEO spam incentive).
6. Consider hiding anonymous pastes from any public "recent pastes" listing (Pastebin.com does this).
7. Never store or display IP addresses publicly, but log them server-side for abuse investigation.

**Detection:** Monitor paste creation rate per IP. Track abuse reports. Check Google Safe Browsing status for your domain periodically.

**Phase:** Phase 1 for rate limiting and paste size limits. Phase 2 for abuse reporting UI and DMCA policy. Phase 3 for content heuristics if abuse becomes a problem.

**Confidence:** HIGH -- documented extensively by SOCRadar, Comodo, and Pastebin.com's own operational history.

---

## Moderate Pitfalls

### Pitfall 5: Rendering Performance on Large Documents

**What goes wrong:** A user pastes a 100KB Markdown document with 50 code blocks, deeply nested lists, and large tables. The real-time preview becomes unusable -- parsing + syntax highlighting + DOM rendering takes seconds, blocking the main thread and freezing the UI.

**Why it happens:** Markdown parsing is CPU-intensive for complex documents. Syntax highlighting (Prism, highlight.js, Shiki) adds significant overhead per code block. Re-rendering the entire document on every keystroke during live preview compounds the problem.

**Prevention:**
1. Debounce preview rendering (300-500ms after last keystroke).
2. Run Markdown parsing in a Web Worker to keep the main thread responsive.
3. Lazy-load syntax highlighting: only highlight code blocks visible in the viewport.
4. Cache rendered HTML for the view page (immutable pastes never change, so cache forever with content-addressed keys).
5. Set a paste size limit (256KB) to bound worst-case rendering time.
6. Consider virtual scrolling for very long rendered output.

**Detection:** Profile rendering time in dev tools. Set performance budgets: preview update should complete within 200ms for 90th percentile documents.

**Phase:** Phase 1 for debouncing and size limits. Phase 2 for Web Worker isolation and lazy highlighting.

**Confidence:** MEDIUM -- well-documented optimization patterns, but severity depends on actual usage patterns.

---

### Pitfall 6: Paste ID Enumeration and Predictable URLs

**What goes wrong:** Using sequential auto-increment IDs (base62-encoded) as paste slugs makes every paste guessable. Attackers enumerate all pastes by incrementing the ID, scraping content including anything sensitive users thought was "unlisted."

**Why it happens:** Sequential IDs are the simplest implementation. Developers assume "unlisted" (no public directory) means "private," but predictable URLs are trivially enumerable.

**Prevention:**
1. Use cryptographically random slugs, not sequential IDs. 8 characters of base62 = 218 trillion possibilities, making brute-force enumeration impractical.
2. Generate slugs server-side using `crypto.randomBytes()` (Node.js) or equivalent CSPRNG.
3. Use database uniqueness constraints to handle the negligible collision probability (0.00004% at scale). Catch duplicate key errors and retry.
4. Consider an unambiguous character set (omit `0O1lI`) to reduce confusion when sharing URLs verbally.
5. Never expose internal database IDs in URLs.

**Detection:** Monitor for sequential URL access patterns in logs (e.g., same IP requesting /a, /b, /c, /d in sequence).

**Phase:** Phase 1 (MVP). Slug generation strategy is a foundational decision that affects database schema and URL structure. Changing it later means migrating all existing URLs.

**Confidence:** HIGH -- standard security guidance for any content-hosting service.

---

### Pitfall 7: Accessibility of Rendered Markdown

**What goes wrong:** User-authored Markdown produces inaccessible HTML. Skipped heading levels (h1 to h3), images without alt text, raw URLs instead of descriptive links, tables without proper headers. Screen reader users cannot navigate or understand the content. 87% of screen reader users rely on headings for navigation (WebAIM survey).

**Why it happens:** The application renders whatever Markdown the user writes. Unlike a CMS where you control the content, a pastebin renders arbitrary user-authored Markdown. You cannot enforce heading hierarchy or alt text requirements on user content.

**Prevention:**
1. Ensure the rendering pipeline produces semantically correct HTML (proper `<h1>`-`<h6>` tags, `<table>` with `<thead>`, `<code>` blocks with language labels).
2. Add application-level accessibility: the paste page itself (chrome around the rendered content) must have proper landmarks, skip navigation, ARIA labels, keyboard navigation, and sufficient color contrast.
3. For the editor, add accessibility hints or warnings (e.g., "Image missing alt text") but don't block submission -- it's user content.
4. Ensure the code syntax highlighting theme has sufficient color contrast (WCAG AA minimum 4.5:1).
5. Test with screen readers (NVDA, VoiceOver) and automated tools (axe, Lighthouse).

**Detection:** Run Lighthouse accessibility audits on the application chrome (not user content). Manual screen reader testing during development.

**Phase:** Phase 1 for semantic HTML rendering and application chrome accessibility. Phase 2 for editor accessibility hints.

**Confidence:** MEDIUM -- well-documented accessibility patterns, but pastebin-specific challenges (arbitrary user content) are less documented.

---

### Pitfall 8: Missing Raw Text Fallback

**What goes wrong:** Users can only view the rendered Markdown. When rendering fails (malformed Markdown, parser bug, unsupported syntax), or when users need the actual source (to copy-paste into their own editor), there is no way to access the original text.

**Why it happens:** Developers focus on the "beautiful rendering" value proposition and treat raw view as an afterthought. Or they store only the rendered HTML, losing the source.

**Prevention:**
1. Always store the original raw Markdown text. Never store only rendered HTML.
2. Provide a prominent "Raw" toggle or button on every paste view (already in project requirements -- good).
3. Serve raw text with `Content-Type: text/plain` at a `/raw/{slug}` endpoint for programmatic access (curl, wget, scripts).
4. If rendering fails or times out, fall back to displaying raw text with a notice, rather than showing an error page.

**Detection:** Ensure the raw endpoint exists and is tested. Verify that the raw text exactly matches what was submitted (no transformation losses).

**Phase:** Phase 1 (MVP). Raw view is listed as an active requirement.

**Confidence:** HIGH -- this is a known user expectation from existing pastebins (Hastebin, GitHub Gist all offer raw view).

---

## Minor Pitfalls

### Pitfall 9: Syntax Highlighting Language Detection Failures

**What goes wrong:** Code blocks without language specifiers (` ``` ` instead of ` ```javascript `) render without highlighting or with wrong-language highlighting via auto-detection. Auto-detection is unreliable and slow.

**Prevention:**
1. Don't auto-detect languages. If no language is specified, render as plain text with monospace formatting.
2. Support fenced code blocks with explicit language hints (` ```python `). This is standard GFM (GitHub Flavored Markdown).
3. Use a highlighting library that fails gracefully when a language grammar is not available (highlight.js handles this well).
4. Lazy-load language grammars on demand rather than bundling all 190+ languages upfront (reduces initial bundle by ~500KB).

**Phase:** Phase 1 for basic syntax highlighting. Phase 2 for lazy-loading language grammars.

**Confidence:** MEDIUM -- common DX issue but not a service-breaking problem.

---

### Pitfall 10: Inadequate Error Handling for Paste Creation Failures

**What goes wrong:** User writes a long Markdown document, hits "Create Paste," and the request fails (network error, server error, rate limit). The content in the editor is lost.

**Prevention:**
1. Persist editor content to `localStorage` on change (debounced). Restore on page load if present.
2. Show clear error messages on creation failure, preserving the editor state.
3. Clear `localStorage` only after successful paste creation and redirect.
4. Add client-side validation before submission (non-empty content, within size limit).

**Phase:** Phase 1 (MVP) for localStorage persistence. It is a small implementation effort with outsized UX impact.

**Confidence:** HIGH -- standard web form best practice, especially important for content-creation UIs.

---

### Pitfall 11: Not Setting Cache Headers for Immutable Pastes

**What goes wrong:** Every view of a paste re-fetches the content from the server. Since pastes are immutable (per project design), this is wasted bandwidth and unnecessary server load.

**Prevention:**
1. Serve paste view pages with aggressive cache headers: `Cache-Control: public, max-age=31536000, immutable` for the paste content.
2. Use content-addressed URLs or ETags for cache busting if paste content ever needs to change.
3. Put a CDN in front of paste view pages. Immutable content is the ideal CDN use case.
4. Cache rendered HTML server-side to avoid re-rendering the same Markdown on every request.

**Phase:** Phase 2 for CDN and cache headers. Phase 1 should at least use ETags.

**Confidence:** HIGH -- basic web performance, especially impactful for immutable content.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Markdown rendering (Phase 1) | XSS via unsanitized output | Sanitize output, not input. Use react-markdown or rehype-sanitize. Deploy CSP. |
| Markdown rendering (Phase 1) | ReDoS from parser regex | Pin library versions, enforce paste size limits, add parsing timeouts. |
| Paste creation (Phase 1) | Predictable/enumerable URLs | Use CSPRNG for slug generation, never sequential IDs. |
| Paste storage (Phase 1) | No expiration in schema | Design `expires_at` into the schema from the start, even if cleanup job comes later. |
| Real-time preview (Phase 1) | UI freeze on large docs | Debounce rendering, consider Web Worker for parser. |
| Paste viewing (Phase 1) | No raw text fallback | Store raw Markdown, provide `/raw/{slug}` endpoint. |
| Editor UX (Phase 1) | Content loss on error | Persist to localStorage, restore on load. |
| Public launch (Phase 2) | Abuse/spam/malware hosting | Rate limiting, abuse reporting, DMCA policy, robots.txt. |
| Scaling (Phase 2+) | Unbounded storage growth | Expiration defaults, background cleanup jobs, paste size limits. |
| Accessibility (Phase 1-2) | Inaccessible application chrome | Semantic HTML, keyboard nav, screen reader testing. |
| Performance (Phase 2) | Slow syntax highlighting | Lazy-load grammars, defer highlighting for off-screen blocks. |
| Caching (Phase 2) | Re-rendering immutable content | Cache headers, CDN, server-side render cache. |

## Sources

- [PastebinMarkdownXSS -- Real-world XSS in Pastebin.com](https://github.com/Nhoya/PastebinMarkdownXSS) (HIGH confidence)
- [Markdown XSS Payloads collection](https://github.com/cujanovic/Markdown-XSS-Payloads) (HIGH confidence)
- [Showdown Markdown XSS Mitigation Guide](https://github.com/showdownjs/showdown/wiki/Markdown's-XSS-Vulnerability-(and-how-to-mitigate-it)) (HIGH confidence)
- [HackerOne: Secure Markdown Rendering in React](https://www.hackerone.com/blog/secure-markdown-rendering-react-balancing-flexibility-and-safety) (HIGH confidence)
- [Strapi: React Markdown Complete Guide -- Security](https://strapi.io/blog/react-markdown-complete-guide-security-styling) (MEDIUM confidence)
- [CVE-2022-21670: markdown-it ReDoS](https://security.snyk.io/vuln/SNYK-JS-MARKDOWNIT-2331914) (HIGH confidence)
- [CVE-2024-21535: markdown-to-jsx XSS](https://security.snyk.io/vuln/SNYK-JS-MARKDOWNTOJSX-6258886) (HIGH confidence)
- [CVE-2025-6493: CodeMirror ReDoS](https://security.snyk.io/vuln/SNYK-JS-CODEMIRROR-10494092) (HIGH confidence)
- [CVE-2022-24833: PrivateBin XSS via SVG](https://security.snyk.io/vuln/SNYK-PHP-PRIVATEBINPRIVATEBIN-2619043) (HIGH confidence)
- [SOCRadar: Top 5 Paste Sites Used by Threat Actors](https://socradar.io/blog/top-5-paste-sites-used-by-threat-actors/) (MEDIUM confidence)
- [OWASP: Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html) (HIGH confidence)
- [OWASP: Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) (HIGH confidence)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (HIGH confidence)
- [Smashing Magazine: Improving Accessibility of Markdown](https://www.smashingmagazine.com/2021/09/improving-accessibility-of-markdown/) (MEDIUM confidence)
- [System Design: Pastebin](https://systemdesignschool.io/problems/pastebin/solution) (MEDIUM confidence)
- [Pastebin.com DMCA Policy](https://pastebin.com/expgRfTG) (HIGH confidence)
- [DOMPurify vs rehype-sanitize (npm trends)](https://npmtrends.com/dompurify-vs-rehype-sanitize-vs-sanitize-html) (MEDIUM confidence)
- [Markdown Security Best Practices](https://www.markdownlang.com/advanced/security.html) (MEDIUM confidence)
