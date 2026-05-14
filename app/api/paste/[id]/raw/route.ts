import { getPasteById } from "@/lib/db/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const paste = getPasteById(id);
  if (!paste) {
    return new Response("Paste not found", { status: 404 });
  }

  return new Response(paste.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
