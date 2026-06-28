import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  env: {
    E2E_TEST: process.env.E2E_TEST,
  },
};

export default nextConfig;
