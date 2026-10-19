import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@excalidraw/excalidraw"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
