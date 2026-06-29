import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  env: {
    E2E_TEST: process.env.E2E_TEST,
  },
};

export default nextConfig;
