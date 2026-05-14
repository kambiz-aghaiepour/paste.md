import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws://localhost:3000" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    sri: {
      algorithm: "sha256",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
