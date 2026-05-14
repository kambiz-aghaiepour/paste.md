import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";
import { createRateLimiter } from "@/lib/rate-limiter";

export const config = {
  matcher: [
    "/:slug([A-Za-z0-9_-]{8})",
    "/api/paste",
  ],
};

const rateLimiter = createRateLimiter(5, 60_000);

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export function proxy(request: NextRequest) {
  // Rate limiting: only POST /api/paste
  if (
    request.nextUrl.pathname === "/api/paste" &&
    request.method === "POST"
  ) {
    const ip = getClientIp(request);
    const result = rateLimiter.check(ip);

    if (result.limited) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSeconds),
          },
        },
      );
    }
    return NextResponse.next();
  }

  // GET /api/paste passes through without rate limiting
  if (request.nextUrl.pathname === "/api/paste") {
    return NextResponse.next();
  }

  // Existing 410 logic for expired pastes
  const slug = request.nextUrl.pathname.slice(1);
  const paste = getPasteById(slug);

  if (paste?.expiresAt && Date.now() / 1000 > paste.expiresAt) {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expired - paste.md</title></head>
<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;background:#fff;color:#1f2937">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background: #111827 !important; color: #f3f4f6 !important; }
      h1 { color: #6b7280 !important; }
      p { color: #9ca3af !important; }
      a { color: #60a5fa !important; }
    }
  </style>
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
