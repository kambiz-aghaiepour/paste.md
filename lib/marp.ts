/**
 * Marp (slide deck) detection and paste-URL view resolution.
 *
 * Pastes may opt into being rendered as an interactive Marp presentation.
 * Detection follows the Marp ecosystem convention: a `marp: true` value in
 * the YAML frontmatter. A URL suffix (`.marp` / `.md`) provides an explicit
 * override for the default rendering mode without changing the core `/id`
 * URL format.
 */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\s*|\r?\n|$)/;

/** Extract the YAML frontmatter body (without the surrounding `---`), or null. */
export function parseFrontmatter(content: string): string | null {
  const text = content.replace(/^\uFEFF/, ""); // strip BOM
  const match = text.match(FRONTMATTER_RE);
  return match ? match[1] : null;
}

/**
 * Whether the content is a Marp slide deck.
 *
 * The canonical signal is a top-level `marp: true` in the frontmatter. We only
 * match a bare top-level key so that nested/other `marp:` references (e.g.
 * inside a YAML block or as a `marp:` string elsewhere) do not trigger a deck.
 */
export function isMarpDeck(content: string): boolean {
  const fm = parseFrontmatter(content);
  if (!fm) return false;
  // Match a top-level `marp: true` key (column 0) to avoid false positives from
  // nested/indented YAML keys. Value may be quoted or unquoted.
  return /(?:^|\n)marp\s*:\s*["']?(true|yes|on)["']?(?:\s*#.*)?(?:\n|$)/i.test(
    fm,
  );
}

/** Extract the `title:` frontmatter value (used for page metadata / previews). */
export function extractFrontmatterTitle(content: string): string | undefined {
  const fm = parseFrontmatter(content);
  if (!fm) return undefined;
  const m = fm.match(/(?:^|\n)\s*title\s*:\s*["']?([^"'\n]+)["']?\s*(?:\n|$)/);
  return m?.[1]?.trim() || undefined;
}

export type PasteViewMode = "presentation" | "document";

export interface ParsedSlug {
  /** The underlying paste id (nanoid), with any view suffix removed. */
  id: string;
  /** An explicit view forced by the URL suffix, or null when using the default. */
  forcedView: PasteViewMode | null;
}

/**
 * Split a paste URL slug into a paste id and an optional forced view.
 *
 * Paste ids are nanoid-based and never contain `.`, so `.marp` / `.md` suffixes
 * are unambiguous. Anything without a recognised suffix is treated as the plain
 * paste id with no forced view.
 */
export function parsePasteIdAndView(slug: string): ParsedSlug {
  const match = slug.match(/^(.*?)\.(marp|md)$/);
  if (match) {
    return {
      id: match[1],
      forcedView: match[2] === "marp" ? "presentation" : "document",
    };
  }
  return { id: slug, forcedView: null };
}
