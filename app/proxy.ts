import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";

export const config = {
  matcher: "/:slug([A-Za-z0-9_-]{8})",
};

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice(1);
  const paste = getPasteById(slug);

  if (paste?.expiresAt && Date.now() / 1000 > paste.expiresAt) {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expired - paste.md</title></head>
<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased">
  <h1 style="margin-bottom:1rem;font-size:2.25rem;font-weight:700;color:#9ca3af">410</h1>
  <p style="margin-bottom:2rem;color:#6b7280">This paste has expired.</p>
  <a href="/" style="color:#2563eb;text-decoration:none">Back to home</a>
</body>
</html>`,
      {
        status: 410,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  return NextResponse.next();
}
