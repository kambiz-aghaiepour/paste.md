import { MarkdownAsync } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAlert } from "remark-github-blockquote-alert";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShiki from "@shikijs/rehype";
import { rehypeExtractMermaid } from "@/app/lib/rehype-extract-mermaid";
import { sanitizeSchema } from "@/app/lib/sanitize-schema";
import { autolinkHeadingsOptions } from "@/app/lib/autolink-headings-options";
import { markdownComponents } from "./markdown-components";

interface MarkdownRendererProps {
  content: string;
}

export async function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-pre:overflow-x-auto prose-img:rounded-lg">
      <MarkdownAsync
        remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
        rehypePlugins={[
          [rehypeSanitize, sanitizeSchema],
          rehypeExtractMermaid,
          rehypeKatex,
          rehypeSlug,
          [rehypeAutolinkHeadings, autolinkHeadingsOptions],
          [rehypeShiki, {
            themes: { light: "github-light", dark: "github-dark" },
            defaultColor: "light",
          }],
        ]}
        components={markdownComponents}
      >
        {content}
      </MarkdownAsync>
    </article>
  );
}
