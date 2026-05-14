import { MarkdownAsync } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeShiki from "@shikijs/rehype";

interface MarkdownRendererProps {
  content: string;
}

export async function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-img:rounded-lg">
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSanitize,
          [rehypeShiki, {
            themes: { light: "github-light", dark: "github-dark" },
            defaultColor: "light",
          }],
        ]}
      >
        {content}
      </MarkdownAsync>
    </article>
  );
}
