import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Udeshya Sharma — Portfolio",
    short_name: "Udeshya",
    description: "Senior full-stack engineer for fintech, AI and Web3 products.",
    start_url: "/",
    display: "standalone",
    background_color: "#04040a",
    theme_color: "#04040a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
