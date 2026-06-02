import { nanoid } from "nanoid";
import { createPaste } from "@/lib/db/queries";
import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";

const MAX_CONTENT_BYTES = 512 * 1024; // 512KB

export type PasteResult = { id: string; url: string };

export function validateExpiration(expiration: string): string | null {
  if (!VALID_EXPIRATIONS.includes(expiration)) {
    return "Invalid expiration value";
  }
  return null;
}

export function validateContent(
  content: string | undefined | null,
): string | null {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return "Content is required";
  }
  const sizeBytes = new TextEncoder().encode(content).byteLength;
  if (sizeBytes > MAX_CONTENT_BYTES) {
    return "Content exceeds 512KB limit";
  }
  return null;
}

export function persistPaste(
  content: string,
  expiration: string,
): PasteResult {
  const sizeBytes = new TextEncoder().encode(content).byteLength;
  const id = nanoid(8);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = computeExpiresAt(now, expiration);

  try {
    createPaste({ id, content, createdAt: now, expiresAt, sizeBytes });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
      const retryId = nanoid(8);
      createPaste({
        id: retryId,
        content,
        createdAt: now,
        expiresAt,
        sizeBytes,
      });
      return { id: retryId, url: `/${retryId}` };
    }
    throw err;
  }

  return { id, url: `/${id}` };
}
