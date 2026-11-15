import os from "node:os";

import type { NextConfig } from "next";

// A witness opens their interview link on their own device, so the dev server must also answer on this
// machine's network address and on NOLAN_PUBLIC_URL. By default `next dev` only serves its scripts to localhost.
const lanAddresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
  .map((entry) => entry!.address);

function publicHost(): string[] {
  try {
    return process.env.NOLAN_PUBLIC_URL ? [new URL(process.env.NOLAN_PUBLIC_URL).hostname] : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Nolan is its own app inside the Milo repo. Without this, Next picks the repo root because of its lockfile.
  turbopack: { root: process.cwd() },
  allowedDevOrigins: [...lanAddresses, ...publicHost()],
};

export default nextConfig;
