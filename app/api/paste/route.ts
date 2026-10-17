import { NextResponse } from "next/server";
import {
  validateContent,
  validateExpiration,
  validatePasteName,
  persistPaste,
  PasteNameConflictError,
} from "@/lib/paste-service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, expiration, name } = body as {
    content?: string;
    expiration?: string;
    name?: string;
  };

  const contentError = validateContent(content);
  if (contentError) {
    const status = contentError.includes("512KB") ? 413 : 400;
    return NextResponse.json({ error: contentError }, { status });
  }

  const expirationValue = expiration ?? "1m";
  const expirationError = validateExpiration(expirationValue);
  if (expirationError) {
    return NextResponse.json({ error: expirationError }, { status: 400 });
  }

  const nameError = validatePasteName(name);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }

  try {
    const result = persistPaste(content!, expirationValue, name?.trim());
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof PasteNameConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
