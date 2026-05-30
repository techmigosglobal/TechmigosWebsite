import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,

  // Remove X-Powered-By header to reduce response size
  poweredByHeader: false,

  // Disable source maps in production for smaller bundles
  productionBrowserSourceMaps: false,

  distDir: process.env.DIST_DIR || '.next',

  // Compress responses
  compress: true,

  images: {
    unoptimized: true,
  },

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'recharts'],
  },

  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
