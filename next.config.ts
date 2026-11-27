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
  // files read at runtime with fs (résumé PDF, OG-image fonts) must be bundled into Vercel functions
  outputFileTracingIncludes: {
    "/": ["./assets/**/*"],
    "/**": ["./assets/**/*"],
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
