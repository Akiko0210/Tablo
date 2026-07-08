import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client router cache: keep visited dashboard page segments for 30s so
    // switching between tabs is instant instead of re-rendering on the server
    // every time. Data-critical views (orders board, overview) poll on top of
    // this, so nothing goes stale where it matters.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
