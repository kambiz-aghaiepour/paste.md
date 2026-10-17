import { NextRequest } from "next/server";
import {
  validateContent,
  validateExpiration,
  validatePasteName,
  persistPaste,
  PasteNameConflictError,
} from "@/lib/paste-service";

function buildFullUrl(request: NextRequest, path: string): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}${path}`;
}

function fail(message: string, status: number): Response {
  return new Response(message + "\n", { status });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let expiration =
    request.nextUrl.searchParams.get("expiration") ?? "1m";
  let name: string | null =
    request.nextUrl.searchParams.get("name") ?? null;

  let content: string | null;
  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid JSON", 400);
    }
    const json = body as {
      content?: string;
      expiration?: string;
      name?: string;
    };
    content = json.content ?? null;
    if (json.expiration) expiration = json.expiration;
    if (json.name) name = json.name;
  } else if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (file instanceof File) {
      content = await file.text();
    } else {
      const raw = formData.get("content");
      content = typeof raw === "string" ? raw : null;
    }
    const formExpiration = formData.get("expiration");
    if (
      typeof formExpiration === "string" &&
      !request.nextUrl.searchParams.get("expiration")
    ) {
      expiration = formExpiration;
    }
    const formName = formData.get("name");
    if (typeof formName === "string" && formName.trim()) {
      name = formName;
    }
  } else {
    content = await request.text();
  }

  const contentError = validateContent(content);
  if (contentError) {
    return fail(contentError, contentError.includes("512KB") ? 413 : 400);
  }

  const expirationError = validateExpiration(expiration);
  if (expirationError) {
    return fail(expirationError, 400);
  }

  const nameError = validatePasteName(name);
  if (nameError) {
    return fail(nameError, 400);
  }

  try {
    const result = persistPaste(content!, expiration, name?.trim() ?? undefined);
    const fullUrl = buildFullUrl(request, result.url);
    return new Response(fullUrl + "\n", {
      status: 201,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    if (err instanceof PasteNameConflictError) {
      return fail(err.message, 409);
    }
    throw err;
  }
}
