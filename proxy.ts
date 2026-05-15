import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPasteById } from "@/lib/db/queries";
import { createRateLimiter } from "@/lib/rate-limiter";

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
    },
  ],
};

const rateLimiter = createRateLimiter(5, 60_000);

const isDev = process.env.NODE_ENV === "development";

const SLUG_PATTERN = /^\/[A-Za-z0-9_-]{8}$/;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self'",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws://localhost:3000" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function setSecurityHeaders(
  response: NextResponse,
  csp: string,
): void {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/paste" && request.method === "POST") {
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
  }

  if (SLUG_PATTERN.test(pathname)) {
    const slug = pathname.slice(1);
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
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  setSecurityHeaders(response, csp);

  return response;
}
