import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPasteById } from "@/lib/db/queries";
import {
  isMarpDeck,
  parsePasteIdAndView,
  extractFrontmatterTitle,
} from "@/lib/marp";
import { MarkdownRenderer } from "@/app/components/markdown-renderer";
import { MarpRenderer } from "@/app/components/marp-renderer";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { id } = parsePasteIdAndView(slug);
  const paste = getPasteById(id);
  if (!paste) return {};

  const title = extractFrontmatterTitle(paste.content);
  if (title) return { title };

  const firstHeading = paste.content.match(/^#\s+(.+)$/m)?.[1];
  if (firstHeading) return { title: firstHeading.trim() };

  return {};
}

export default async function PastePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { id, forcedView } = parsePasteIdAndView(slug);

  const paste = getPasteById(id);
  if (!paste) {
    notFound();
  }

  const now = Math.floor(Date.now() / 1000);

  if (paste.expiresAt && now > paste.expiresAt) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-400 dark:text-gray-500">
          Expired
        </h1>
        <p className="mb-8 text-gray-500 dark:text-gray-400">
          This paste has expired.
        </p>
        <Link
          href="/"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to home
        </Link>
      </main>
    );
  }

  const remaining = paste.expiresAt ? paste.expiresAt - now : null;

  // Marp decks auto-render as presentations; the `.marp` / `.md` suffixes let a
  // pasted URL force a specific view without changing the core `/id` format.
  const isMarp = isMarpDeck(paste.content);
  const showPresentation = isMarp || forcedView === "presentation";
  const defaultTab =
    forcedView ?? (showPresentation ? "presentation" : "document");

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-8">
      <PasteView
        content={paste.content}
        renderedContent={<MarkdownRenderer content={paste.content} />}
        presentationContent={
          showPresentation ? (
            <MarpRenderer content={paste.content} />
          ) : undefined
        }
        defaultTab={defaultTab}
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
