import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Test builds must not overwrite an active development/production build.
  distDir: process.env.COUG_TEST_RUN === "true" ? ".next-test" : ".next",
  output: "standalone",
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
