import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Resume PDFs + project images uploaded from /admin
      bodySizeLimit: "12mb",
    },
  },
  async redirects() {
    // the work archive lives in the home page's horizontal gallery
    return [{ source: "/projects", destination: "/#projects", permanent: false }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
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
