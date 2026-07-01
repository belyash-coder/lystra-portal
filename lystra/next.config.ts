import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://lystra-api.vercel.app/api/:path*',
      },
    ];
  },
};

export default nextConfig;