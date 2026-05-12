import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/showcase',

  // Remove X-Powered-By header to reduce response size
  poweredByHeader: false,

  // Disable source maps in production for smaller bundles
  productionBrowserSourceMaps: false,

  distDir: process.env.DIST_DIR || '.next',

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Compress responses
  compress: true,

  output: 'export',
  images: {
    unoptimized: true,
  },

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'recharts'],
  },
};

export default nextConfig;