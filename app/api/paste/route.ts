import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createPaste } from "@/lib/db/queries";
import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";

const MAX_CONTENT_BYTES = 512 * 1024; // 512KB

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, expiration } = body as {
    content?: string;
    expiration?: string;
  };

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 },
    );
  }

  const sizeBytes = new TextEncoder().encode(content).byteLength;
  if (sizeBytes > MAX_CONTENT_BYTES) {
    return NextResponse.json(
      { error: "Content exceeds 512KB limit" },
      { status: 413 },
    );
  }

  const expirationValue = expiration ?? "never";
  if (!VALID_EXPIRATIONS.includes(expirationValue)) {
    return NextResponse.json(
      { error: "Invalid expiration value" },
      { status: 400 },
    );
  }

  const id = nanoid(8);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = computeExpiresAt(now, expirationValue);

  try {
    createPaste({
      id,
      content,
      createdAt: now,
      expiresAt,
      sizeBytes,
    });
  } catch (err: unknown) {
    // Handle extremely unlikely nanoid collision
    if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
      const retryId = nanoid(8);
      createPaste({
        id: retryId,
        content,
        createdAt: now,
        expiresAt,
        sizeBytes,
      });
      return NextResponse.json(
        { id: retryId, url: `/${retryId}` },
        { status: 201 },
      );
    }
    throw err;
  }

  return NextResponse.json({ id, url: `/${id}` }, { status: 201 });
}
