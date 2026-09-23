import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@marp-team/marp-core"],
};

export default nextConfig;
