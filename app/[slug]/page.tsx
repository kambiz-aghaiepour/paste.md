import { notFound } from "next/navigation";
import { getPasteById } from "@/lib/db/queries";

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
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-6 font-mono text-sm">
        {paste.content}
      </pre>
      <p className="mt-4 text-sm text-gray-500">
        Created: {new Date(paste.createdAt * 1000).toISOString()}
      </p>
    </main>
  );
}
