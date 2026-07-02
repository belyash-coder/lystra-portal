import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/invite',
        destination: '/invite.html',
      },
      {
        source: '/api/invite',
        destination: '/invite.html',
      }
    ];
  },
};

export default nextConfig;