"use client";

import type { Components } from "react-markdown";
import type { Element } from "hast";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkGemoji from "remark-gemoji";
import { remarkAlert } from "remark-github-blockquote-alert";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { rehypeExtractMermaid } from "@/app/lib/rehype-extract-mermaid";
import { sanitizeSchema } from "@/app/lib/sanitize-schema";
import { autolinkHeadingsOptions } from "@/app/lib/autolink-headings-options";
import { markdownComponents } from "./markdown-components";
import { PreviewCodeBlock } from "./preview-code-block";

const previewComponents: Components = {
  ...markdownComponents,
  pre({ children, node, ...props }) {
    const codeChild = node?.children?.find(
      (child): child is Element =>
        child.type === "element" && child.tagName === "code",
    );
    if (codeChild) {
      const classNames = codeChild.properties?.className;
      if (
        Array.isArray(classNames) &&
        classNames.some(
          (c) => typeof c === "string" && c.startsWith("language-"),
        )
      ) {
        return <>{children}</>;
      }
    }
    return <pre {...props}>{children}</pre>;
  },
  code({ children, className, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    if (match) {
      return (
        <PreviewCodeBlock
          code={String(children).replace(/\n$/, "")}
          lang={match[1]}
        />
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div
      className="prose prose-gray dark:prose-invert max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-img:rounded-lg"
      role="region"
      aria-label="Markdown preview"
      aria-live="polite"
    >
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath, remarkAlert, remarkGemoji]}
        rehypePlugins={[
          [rehypeSanitize, sanitizeSchema],
          rehypeExtractMermaid,
          rehypeKatex,
          rehypeSlug,
          [rehypeAutolinkHeadings, autolinkHeadingsOptions],
        ]}
        components={previewComponents}
      >
        {content}
      </Markdown>
    </div>
  );
}
