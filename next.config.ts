import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'perenne-ai.vercel.app',
          },
        ],
        destination: 'https://perenne-ai.co.uk/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.perenne-ai.co.uk',
          },
        ],
        destination: 'https://perenne-ai.co.uk/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
// Force Next.js dev server to restart and load new .env variables
