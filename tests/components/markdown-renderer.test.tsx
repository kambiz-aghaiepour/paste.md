// @vitest-environment node
import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { rehypeExtractMermaid } from "../../app/lib/rehype-extract-mermaid";
import { sanitizeSchema } from "../../app/lib/sanitize-schema";
import { autolinkHeadingsOptions } from "../../app/lib/autolink-headings-options";

async function processMarkdown(input: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkAlert)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeExtractMermaid)
    .use(rehypeKatex)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, autolinkHeadingsOptions)
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

  it("REND-04: renders inline math with KaTeX", async () => {
    const input = "The formula $E=mc^2$ is famous.";

    const output = await processMarkdown(input);

    expect(output).toContain("katex");
    expect(output).toContain("E");
    expect(output).toContain("mc");
  });

  it("REND-04: renders block math with KaTeX", async () => {
    const input = `$$
\\sum_{i=1}^n i = \\frac{n(n+1)}{2}
$$`;

    const output = await processMarkdown(input);

    expect(output).toContain("katex-display");
    expect(output).toContain("frac");
  });

  it("REND-05: adds id attributes to headings", async () => {
    const input = "## Hello World";

    const output = await processMarkdown(input);

    expect(output).toContain('<h2 id="hello-world"');
  });

  it("REND-05: adds anchor links to headings", async () => {
    const input = "## Hello World";

    const output = await processMarkdown(input);

    expect(output).toContain('class="anchor"');
    expect(output).toContain('href="#hello-world"');
  });

  it("REND-06: renders GitHub-style note alert", async () => {
    const input = `> [!NOTE]
> This is a note.`;

    const output = await processMarkdown(input);

    expect(output).toContain("markdown-alert");
    expect(output).toContain("markdown-alert-note");
    expect(output).toContain("This is a note.");
  });

  it("REND-06: renders all five alert types", async () => {
    const types = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];

    for (const type of types) {
      const input = `> [!${type}]\n> Alert content.`;
      const output = await processMarkdown(input);
      expect(output).toContain(`markdown-alert-${type.toLowerCase()}`);
    }
  });

  it("REND-06: strips SVG icons from alerts (CSS provides icons instead)", async () => {
    const input = `> [!NOTE]
> Text.`;

    const output = await processMarkdown(input);

    expect(output).not.toContain("<svg");
    expect(output).not.toContain("<path");
  });

  it("SECU-01: strips script tags inside alerts", async () => {
    const input = `> [!NOTE]
> Safe text
>
> <script>alert("xss")</script>`;

    const output = await processMarkdown(input);

    expect(output).not.toContain("<script");
    expect(output).not.toContain("alert(");
    expect(output).toContain("Safe text");
  });
});
