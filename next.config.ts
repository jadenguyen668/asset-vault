import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
