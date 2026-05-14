import { notFound } from "next/navigation";
import { getPasteById } from "@/lib/db/queries";
import { MarkdownRenderer } from "@/app/components/markdown-renderer";
import { PasteView } from "./components/paste-view";

function formatRelativeTime(seconds: number): string {
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  const days = Math.round(seconds / 86400);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

export default async function PastePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const paste = getPasteById(slug);
  if (!paste) {
    notFound();
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = paste.expiresAt ? paste.expiresAt - now : null;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <PasteView
        content={paste.content}
        renderedContent={<MarkdownRenderer content={paste.content} />}
        expiresAt={paste.expiresAt}
      />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Created: {new Date(paste.createdAt * 1000).toISOString()}
      </p>
      {remaining !== null && remaining > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Expires in {formatRelativeTime(remaining)}
        </p>
      )}
    </main>
  );
}
