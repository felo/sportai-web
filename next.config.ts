import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'
import { execSync } from 'child_process'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

// Generate version info at build time
function getVersionInfo() {
  // Base version (update these for major/minor releases)
  const MAJOR = 0
  const MINOR = 7
  
  // Check for Vercel environment variables first
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA
  const vercelBranch = process.env.VERCEL_GIT_COMMIT_REF
  
  let commitCount: string
  let shortSha: string
  
  if (vercelSha) {
    // Running on Vercel - use timestamp-based patch for uniqueness
    shortSha = vercelSha.substring(0, 7)
    const now = new Date()
    // Format: YYMMDDHH ensures always-increasing version
    commitCount = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}`
  } else {
    // Local development - use git
    try {
      commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim()
      shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    } catch {
      commitCount = 'dev'
      shortSha = 'local'
    }
  }
  
  return {
    version: `v${MAJOR}.${MINOR}.${commitCount}`,
    shortSha,
    buildDate: new Date().toISOString(),
  }
}

const versionInfo = getVersionInfo()

const nextConfig: NextConfig = {
  // Expose version info and environment to client-side code
  env: {
    NEXT_PUBLIC_APP_VERSION: versionInfo.version,
    NEXT_PUBLIC_GIT_SHA: versionInfo.shortSha,
    NEXT_PUBLIC_BUILD_DATE: versionInfo.buildDate,
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || 'development',
  },
  // Externalize TensorFlow and MediaPipe packages on server side
  // These packages only work in the browser and cause issues with Turbopack bundling
  serverExternalPackages: [
    '@tensorflow/tfjs',
    '@tensorflow/tfjs-core',
    '@tensorflow/tfjs-backend-webgl',
    '@tensorflow/tfjs-backend-webgpu',
    '@tensorflow/tfjs-converter',
    '@tensorflow-models/pose-detection',
    '@mediapipe/pose',
  ],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sportai-llm-uploads.s3.eu-north-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year for better caching
  },
  
  // Bundle optimization - remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Optimize package imports - reduces bundle size significantly
  // Note: Don't include packages that are in serverExternalPackages
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/themes',
      'three',
    ],
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Optimize Three.js tree-shaking
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/three/,
      sideEffects: false,
    });
    
    // Don't bundle TensorFlow on server side (it's client-only)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@tensorflow/tfjs': 'commonjs @tensorflow/tfjs',
        '@tensorflow/tfjs-backend-webgl': 'commonjs @tensorflow/tfjs-backend-webgl',
        '@tensorflow-models/pose-detection': 'commonjs @tensorflow-models/pose-detection',
      });
    }
    
    // Provide empty fallback for @tensorflow/tfjs-backend-webgpu
    // The pose-detection library imports it unconditionally but we only use WebGL
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@tensorflow/tfjs-backend-webgpu': false,
    };
    
    return config;
  },

  // PostHog rewrites
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ]
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Production optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security
}

export default withBundleAnalyzer(nextConfig)
