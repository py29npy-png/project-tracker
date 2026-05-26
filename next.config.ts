import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.0.102", "127.0.0.1", "localhost"]
};

export default nextConfig;
