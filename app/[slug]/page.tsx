import { notFound } from "next/navigation";
import { getPasteById } from "@/lib/db/queries";
import { MarkdownRenderer } from "@/app/components/markdown-renderer";

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

  return (
    <main className="mx-auto max-w-3xl p-8">
      <MarkdownRenderer content={paste.content} />
      <p className="mt-4 text-sm text-gray-500">
        Created: {new Date(paste.createdAt * 1000).toISOString()}
      </p>
    </main>
  );
}
