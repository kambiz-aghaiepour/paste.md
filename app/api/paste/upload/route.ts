import { NextRequest } from "next/server";
import {
  validateContent,
  validateExpiration,
  persistPaste,
} from "@/lib/paste-service";

function buildFullUrl(request: NextRequest, path: string): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}${path}`;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let expiration =
    request.nextUrl.searchParams.get("expiration") ?? "1m";

  let content: string | null;
  if (contentType.includes("multipart/form-data")) {
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
  } else {
    content = await request.text();
  }

  const contentError = validateContent(content);
  if (contentError) {
    const status = contentError.includes("512KB") ? 413 : 400;
    return new Response(contentError + "\n", { status });
  }

  const expirationError = validateExpiration(expiration);
  if (expirationError) {
    return new Response(expirationError + "\n", { status: 400 });
  }

  const result = persistPaste(content!, expiration);
  const fullUrl = buildFullUrl(request, result.url);

  return new Response(fullUrl + "\n", {
    status: 201,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
