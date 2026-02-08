import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ["src"],
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/health",
        destination: "http://localhost:3001/health",
      },
      {
        source: "/docs",
        destination: "http://localhost:3001/docs",
      },
      {
        source: "/docs/:path*",
        destination: "http://localhost:3001/docs/:path*",
      },
      {
        source: "/api/openapi",
        destination: "http://localhost:3001/docs/openapi.json",
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
