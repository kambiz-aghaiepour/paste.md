import { nanoid } from "nanoid";
import { createPaste } from "@/lib/db/queries";
import { computeExpiresAt, VALID_EXPIRATIONS } from "@/lib/expiration";

const MAX_CONTENT_BYTES = 512 * 1024; // 512KB
const MAX_NAME_LENGTH = 64;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const RESERVED_NAMES: Record<string, true> = {
  login: true,
  logout: true,
  internal: true,
  api: true,
  _next: true,
  "favicon.ico": true,
  "robots.txt": true,
};

export function validatePasteName(name: string | undefined | null): string | null {
  if (!name || name.trim().length === 0) return null;
  const value = name.trim();
  if (value.length > MAX_NAME_LENGTH) {
    return "Paste name is too long (max 64 characters)";
  }
  if (!NAME_PATTERN.test(value)) {
    return "Paste name may only contain letters, numbers, dots, underscores and dashes";
  }
  if (RESERVED_NAMES[value]) {
    return "That paste name is reserved";
  }
  return null;
}

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

export class PasteNameConflictError extends Error {
  constructor() {
    super("Paste name already exists");
    this.name = "PasteNameConflictError";
  }
}

export function persistPaste(
  content: string,
  expiration: string,
  name?: string,
): PasteResult {
  const sizeBytes = new TextEncoder().encode(content).byteLength;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = computeExpiresAt(now, expiration);

  if (name) {
    const validName = name.trim();
    try {
      createPaste({
        id: validName,
        content,
        createdAt: now,
        expiresAt,
        sizeBytes,
      });
      return { id: validName, url: `/${validName}` };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
        throw new PasteNameConflictError();
      }
      throw err;
    }
  }

  const id = nanoid(8);
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
