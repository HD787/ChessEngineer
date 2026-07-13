import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.167", "192.168.1.108"],
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
