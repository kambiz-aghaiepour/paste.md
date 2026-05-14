import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const paste = getPasteById(id);
  if (!paste) {
    return NextResponse.json({ error: "Paste not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: paste.id,
    content: paste.content,
    created_at: paste.createdAt,
    expires_at: paste.expiresAt,
  });
}
