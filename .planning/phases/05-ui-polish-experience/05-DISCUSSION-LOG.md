# Phase 5: UI Polish & Experience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 05-UI Polish & Experience
**Areas discussed:** Dark mode strategy, Copy-to-clipboard mechanism, Mobile responsiveness, Visual cleanup
**Mode:** --auto (all decisions auto-selected)

---

## Dark Mode Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind class strategy with system + manual toggle | Class-based dark mode with localStorage persistence and FOWT prevention script | ✓ |
| Media-only dark mode | Simpler, system-preference-only, no manual toggle | |
| next-themes library | Third-party library handling all dark mode concerns | |

**Auto-selected:** Tailwind class strategy with system + manual toggle (recommended default)
**Notes:** Class-based is required to support both system preference AND manual toggle. Media-only would satisfy the system preference part but not the manual toggle requirement (UI-04).

### Sub-decision: Shiki dark theme

| Option | Description | Selected |
|--------|-------------|----------|
| Dual theme (github-light/github-dark) | Server-rendered CSS variables, zero client JS theme switching | ✓ |
| Single theme with CSS filter inversion | Hacky, poor color accuracy | |
| Runtime theme switching | Re-renders code blocks on theme change, client JS cost | |

**Auto-selected:** Dual theme with github-light/github-dark (recommended default)

### Sub-decision: Theme toggle placement

| Option | Description | Selected |
|--------|-------------|----------|
| Header bar with logo + toggle | Consistent location, adds navigation, addresses branding | ✓ |
| Floating toggle button | Corner-positioned, no header needed | |
| Footer toggle | Out of sight, poor discoverability | |

**Auto-selected:** Header bar with logo + toggle (recommended default)

---

## Copy-to-Clipboard Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| react-markdown components override for pre | Client Component wrapper, copy button in top-right of code blocks | ✓ |
| Global DOM script for all pre elements | No react-markdown integration needed, but bypasses React | |
| Shiki transformer plugin | Adds copy button during Shiki rendering, server-side only | |

**Auto-selected:** react-markdown components override for pre (recommended default)
**Notes:** Follows the existing RSC → Client Component wrapper pattern established in Phase 2/3 (paste view renders server-side, interactivity via Client Component).

---

## Mobile Responsiveness

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal scroll for code blocks + padding adjustment | overflow-x-auto on pre, reduced mobile padding | ✓ |
| Line wrapping for code | Breaks code readability | |

**Auto-selected:** Horizontal scroll for code blocks + padding adjustment (recommended default)
**Notes:** Standard approach. Code readability requires preserved formatting, not wrapping.

---

## Visual Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Systematic dark: variant audit | Add dark: counterparts to all hardcoded colors, consistent palette | ✓ |
| Full redesign | Beyond phase scope | |

**Auto-selected:** Systematic dark: variant audit (recommended default)
**Notes:** The app is already minimal. Main work is adding dark: Tailwind variants to every component with hardcoded light-mode colors.

---

## Claude's Discretion

- Toggle icon implementation (inline SVG vs heroicons vs emoji)
- Header height and styling details
- Copy button icon and positioning
- Mobile padding breakpoints
- Theme switching transitions/animations
- Exact dark mode color values
- Copy button inclusion in editor preview
- CSP adjustment approach for FOWT script
