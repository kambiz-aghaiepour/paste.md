// @vitest-environment node
import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { rehypeExtractMermaid } from "../../app/lib/rehype-extract-mermaid";

/**
 * Processes Markdown through the same plugin pipeline as MarkdownRenderer:
 * remarkParse -> remarkGfm -> remarkRehype -> rehypeSanitize -> rehypeShiki -> rehypeStringify
 *
 * This mirrors the exact plugin ordering in app/components/markdown-renderer.tsx
 * (sanitize BEFORE shiki) to test the same code path without the React Server Component runtime.
 */
async function processMarkdown(input: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeExtractMermaid)
    .use(rehypeShiki, { themes: { light: "github-light", dark: "github-dark" }, defaultColor: "light" })
    .use(rehypeStringify)
    .process(input);
  return String(result);
}

describe("MarkdownRenderer pipeline", () => {
  it("REND-01: renders GFM table with th and td elements", async () => {
    const input = `| Header 1 | Header 2 |
|----------|----------|
| Cell A   | Cell B   |`;

    const output = await processMarkdown(input);

    expect(output).toContain("<th");
    expect(output).toContain("<td");
    expect(output).toContain("Header 1");
    expect(output).toContain("Cell A");
  });

  it("REND-01: renders GFM task list with checkbox inputs", async () => {
    const input = `- [x] Done
- [ ] Todo`;

    const output = await processMarkdown(input);

    expect(output).toContain('<input');
    expect(output).toContain('type="checkbox"');
    expect(output).toContain("Done");
    expect(output).toContain("Todo");
  });

  it("REND-01: renders GFM strikethrough with del element", async () => {
    const input = "~~deleted~~";

    const output = await processMarkdown(input);

    expect(output).toContain("<del");
    expect(output).toContain("deleted");
  });

  it("REND-02: renders code block with Shiki syntax highlighting", async () => {
    const input = `\`\`\`javascript
const x = 1;
\`\`\``;

    const output = await processMarkdown(input);

    // Shiki wraps tokens in spans with inline style attributes for color
    expect(output).toContain("<pre");
    expect(output).toContain("<span");
    expect(output).toContain("style=");
  });

  it("SECU-01: strips script tags from input", async () => {
    const input = 'Hello\n\n<script>alert("xss")</script>\n\nSafe text';

    const output = await processMarkdown(input);

    // Must not contain dangerous content
    expect(output).not.toContain("<script");
    expect(output).not.toContain("alert");
    // Must contain safe content (prevents false positive from empty output -- T-02-10)
    expect(output).toContain("Hello");
    expect(output).toContain("Safe text");
  });

  it("SECU-01: strips javascript: URLs from links", async () => {
    const input = "[click](javascript:alert(1))";

    const output = await processMarkdown(input);

    // Must not contain dangerous javascript: protocol
    expect(output).not.toContain("javascript:");
  });

  it("UI-04: renders dual-theme CSS variables for code blocks", async () => {
    const input = `\`\`\`javascript
const greeting = "Hello";
\`\`\``;

    const output = await processMarkdown(input);

    // Shiki dual-theme mode generates --shiki-dark CSS variables
    expect(output).toContain("--shiki-dark");
  });

  it("REND-03: transforms mermaid code blocks into data-mermaid-source divs", async () => {
    const input = `\`\`\`mermaid
graph TD;
    A-->B;
    B-->C;
\`\`\``;

    const output = await processMarkdown(input);

    expect(output).toContain('data-mermaid-source="');
    expect(output).not.toContain("<pre");
    expect(output).toContain("graph TD;");
  });

  it("REND-03: preserves non-mermaid code blocks through mermaid extraction", async () => {
    const input = `\`\`\`javascript
const x = 1;
\`\`\``;

    const output = await processMarkdown(input);

    expect(output).toContain("<pre");
    expect(output).toContain("<span");
    expect(output).toContain("style=");
    expect(output).not.toContain("data-mermaid-source");
  });

  it("REND-03: handles mermaid and code blocks in the same document", async () => {
    const input = `\`\`\`mermaid
graph LR; A-->B;
\`\`\`

\`\`\`python
print("hello")
\`\`\``;

    const output = await processMarkdown(input);

    expect(output).toContain('data-mermaid-source="graph LR; A-->B;"');
    expect(output).toContain("<pre");
    expect(output).toContain("style=");
  });

  it("SECU-01: preserves Shiki styles after sanitization", async () => {
    const input = `\`\`\`javascript
const greeting = "Hello, World!";
\`\`\``;

    const output = await processMarkdown(input);

    // Shiki adds inline styles with color values to spans
    // Because sanitize runs BEFORE shiki, Shiki's styling is preserved
    expect(output).toContain("<span");
    expect(output).toMatch(/style="color:/);
  });
});
