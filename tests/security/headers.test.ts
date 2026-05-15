import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

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

    for (let i = 0; i < 5; i++) {
      const request = makeProxyRequest("/api/paste", "POST", ip);
      proxy(request);
    }

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

    for (let i = 0; i < 5; i++) {
      proxy(makeProxyRequest("/api/paste", "POST", ip1));
    }

    const blockedResponse = proxy(
      makeProxyRequest("/api/paste", "POST", ip1),
    );
    expect(blockedResponse.status).toBe(429);

    const allowedResponse = proxy(
      makeProxyRequest("/api/paste", "POST", ip2),
    );
    expect(allowedResponse.status).not.toBe(429);
  });

  it("SECU-03: GET /api/paste is not rate-limited", () => {
    const ip = "rate-test-get-" + Date.now();

    for (let i = 0; i < 10; i++) {
      const request = makeProxyRequest("/api/paste", "GET", ip);
      const response = proxy(request);
      expect(response.status).not.toBe(429);
    }
  });
});

describe("SECU-02: CSP and security headers via proxy", () => {
  function makePageRequest(path = "/"): NextRequest {
    return new NextRequest(new URL(`http://localhost:3000${path}`));
  }

  it("SECU-02: proxy sets Content-Security-Policy header with nonce", () => {
    const response = proxy(makePageRequest());
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toMatch(/nonce-[A-Za-z0-9+/=]+/);
    expect(csp).toContain("'strict-dynamic'");
  });

  it("SECU-02: proxy generates unique nonce per request", () => {
    const csp1 = proxy(makePageRequest()).headers.get(
      "Content-Security-Policy",
    )!;
    const csp2 = proxy(makePageRequest()).headers.get(
      "Content-Security-Policy",
    )!;

    const nonce1 = csp1.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    const nonce2 = csp2.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });

  it("SECU-02: proxy sets X-Content-Type-Options", () => {
    const response = proxy(makePageRequest());
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("SECU-02: proxy sets X-Frame-Options", () => {
    const response = proxy(makePageRequest());
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("SECU-02: proxy sets Referrer-Policy", () => {
    const response = proxy(makePageRequest());
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });
});
