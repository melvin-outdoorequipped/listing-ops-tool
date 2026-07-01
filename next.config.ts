import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Make sure this is at root level
  staticPageGenerationTimeout: 180,
  
  // If you're using server components with these packages
  serverExternalPackages: [
    'xlsx',
    'google-spreadsheet',
    'google-auth-library',
    'googleapis',
    'exceljs'
  ],
  
  experimental: {
    // Remove or comment out optimizeCss first to test
    // optimizeCss: true,
  },
  
  // Ignore ESLint and TypeScript errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig;