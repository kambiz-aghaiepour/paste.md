"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { rehypeExtractMermaid } from "@/app/lib/rehype-extract-mermaid";
import { markdownComponents } from "./markdown-components";

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
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeExtractMermaid]}
        components={markdownComponents}
      >
        {content}
      </Markdown>
    </div>
  );
}
