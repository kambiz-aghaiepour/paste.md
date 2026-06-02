import { NextResponse } from "next/server";
import {
  validateContent,
  validateExpiration,
  persistPaste,
} from "@/lib/paste-service";

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

  const result = persistPaste(content!, expirationValue);
  return NextResponse.json(result, { status: 201 });
}
