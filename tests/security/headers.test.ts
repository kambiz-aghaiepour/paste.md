import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/app/proxy";
import nextConfig from "../../next.config";

function makeProxyRequest(
  path: string,
  method: string,
  ip: string,
): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    method,
    headers: { "x-forwarded-for": ip },
  });
}

describe("SECU-03: Rate limiting on POST /api/paste", () => {
  it("SECU-03: allows 5 POST requests from the same IP", () => {
    const ip = "rate-test-allow-" + Date.now();

    for (let i = 0; i < 5; i++) {
      const request = makeProxyRequest("/api/paste", "POST", ip);
      const response = proxy(request);
      expect(response.status).not.toBe(429);
    }
  });

  it("SECU-03: blocks 6th POST request from same IP with 429", () => {
    const ip = "rate-test-block-" + Date.now();

    // Exhaust the 5-request limit
    for (let i = 0; i < 5; i++) {
      const request = makeProxyRequest("/api/paste", "POST", ip);
      proxy(request);
    }

    // 6th request should be blocked
    const request = makeProxyRequest("/api/paste", "POST", ip);
    const response = proxy(request);
    expect(response.status).toBe(429);
  });

  it("SECU-03: 429 response body contains correct error message", async () => {
    const ip = "rate-test-body-" + Date.now();

    for (let i = 0; i < 5; i++) {
      proxy(makeProxyRequest("/api/paste", "POST", ip));
    }

    const response = proxy(makeProxyRequest("/api/paste", "POST", ip));
    const data = await response.json();
    expect(data).toEqual({
      error: "Rate limit exceeded. Try again later.",
    });
  });

  it("SECU-03: 429 response includes Retry-After header with positive value", () => {
    const ip = "rate-test-retry-" + Date.now();

    for (let i = 0; i < 5; i++) {
      proxy(makeProxyRequest("/api/paste", "POST", ip));
    }

    const response = proxy(makeProxyRequest("/api/paste", "POST", ip));
    const retryAfter = response.headers.get("Retry-After");
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("SECU-03: allows POST from different IP when first IP is limited", () => {
    const ip1 = "rate-test-ip1-" + Date.now();
    const ip2 = "rate-test-ip2-" + Date.now();

    // Exhaust ip1
    for (let i = 0; i < 5; i++) {
      proxy(makeProxyRequest("/api/paste", "POST", ip1));
    }

    // Verify ip1 is limited
    const blockedResponse = proxy(
      makeProxyRequest("/api/paste", "POST", ip1),
    );
    expect(blockedResponse.status).toBe(429);

    // ip2 should not be limited
    const allowedResponse = proxy(
      makeProxyRequest("/api/paste", "POST", ip2),
    );
    expect(allowedResponse.status).not.toBe(429);
  });

  it("SECU-03: GET /api/paste is not rate-limited", () => {
    const ip = "rate-test-get-" + Date.now();

    // Send more than 5 GET requests -- none should be limited
    for (let i = 0; i < 10; i++) {
      const request = makeProxyRequest("/api/paste", "GET", ip);
      const response = proxy(request);
      expect(response.status).not.toBe(429);
    }
  });
});

describe("SECU-02: CSP and security headers configuration", () => {
  it("SECU-02: next.config.ts headers() returns Content-Security-Policy", async () => {
    const headersFn = nextConfig.headers;
    expect(headersFn).toBeDefined();

    const headerEntries = await headersFn!();
    const globalEntry = headerEntries.find(
      (entry) => entry.source === "/(.*)",
    );
    expect(globalEntry).toBeDefined();

    const cspHeader = globalEntry!.headers.find(
      (h) => h.key === "Content-Security-Policy",
    );
    expect(cspHeader).toBeDefined();
    expect(cspHeader!.value).toContain("default-src 'self'");
    expect(cspHeader!.value).toContain("script-src 'self'");
  });

  it("SECU-02: next.config.ts headers() returns X-Content-Type-Options", async () => {
    const headerEntries = await nextConfig.headers!();
    const globalEntry = headerEntries.find(
      (entry) => entry.source === "/(.*)",
    );

    const header = globalEntry!.headers.find(
      (h) => h.key === "X-Content-Type-Options",
    );
    expect(header).toBeDefined();
    expect(header!.value).toBe("nosniff");
  });

  it("SECU-02: next.config.ts headers() returns X-Frame-Options", async () => {
    const headerEntries = await nextConfig.headers!();
    const globalEntry = headerEntries.find(
      (entry) => entry.source === "/(.*)",
    );

    const header = globalEntry!.headers.find(
      (h) => h.key === "X-Frame-Options",
    );
    expect(header).toBeDefined();
    expect(header!.value).toBe("DENY");
  });

  it("SECU-02: next.config.ts headers() returns Referrer-Policy", async () => {
    const headerEntries = await nextConfig.headers!();
    const globalEntry = headerEntries.find(
      (entry) => entry.source === "/(.*)",
    );

    const header = globalEntry!.headers.find(
      (h) => h.key === "Referrer-Policy",
    );
    expect(header).toBeDefined();
    expect(header!.value).toBe("strict-origin-when-cross-origin");
  });
});
