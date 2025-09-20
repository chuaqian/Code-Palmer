import type { NextConfig } from "next";

// Set Turbopack root to this app to silence multi-lockfile root warnings
// See: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
