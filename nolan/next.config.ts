import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nolan is its own app inside the Milo repo. Without this, Next picks the repo root because of its lockfile.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
