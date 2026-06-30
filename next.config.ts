import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  staticPageGenerationTimeout: 180,
  
  experimental: {
    optimizeCss: true,
    // External packages for server components (moved here in Next.js 15)
    serverComponentsExternalPackages: [
      'xlsx',
      'google-spreadsheet',
      'google-auth-library',
      'googleapis',
      'exceljs'
    ],
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