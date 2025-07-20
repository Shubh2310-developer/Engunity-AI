/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // =================================
  // Core Next.js 14 Configuration
  // =================================
  
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Use SWC for faster compilation and minification
  swcMinify: true,
  
  // =================================
  // Performance Optimizations
  // =================================
  
  // Enable experimental features for production-grade performance
  experimental: {
    // Enable server actions for form handling
    serverActions: {
      allowedOrigins: ['localhost:3000', 'engunity-ai.vercel.app'],
    },
    
    // Enable server components logging
    serverComponentsExternalPackages: ['mongoose', 'mongodb'],
    
    // Enable experimental scrollRestoration
    scrollRestoration: true,
    
    // Enable memory optimizations
    memoryBasedWorkersCount: true,
    
    // Enable instrumentation hook
    instrumentationHook: true,
  },
  
  // =================================
  // Build and Compilation Settings
  // =================================
  
  // Optimize compilation for production
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    
    // Enable styled-components if used
    styledComponents: false,
  },
  
  // =================================
  // Image Optimization
  // =================================
  
  images: {
    // Define allowed image domains
    domains: [
      'localhost',
      'supabase.co',
      'engunity-ai.vercel.app',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
    ],
    
    // Supported image formats
    formats: ['image/webp', 'image/avif'],
    
    // Image sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Enable image optimization
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    
    // Remote patterns for external images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  
  // =================================
  // Environment Variables
  // =================================
  
  // Public environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Server-side runtime configuration
  serverRuntimeConfig: {
    // Only available on the server side
    secretKey: process.env.SECRET_KEY,
  },
  
  // Public runtime configuration
  publicRuntimeConfig: {
    // Available on both server and client
    appVersion: process.env.npm_package_version,
    appName: 'Engunity AI',
  },
  
  // =================================
  // Security Headers
  // =================================
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // CSP for enhanced security
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-analytics.com *.google-analytics.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: *.supabase.co *.githubusercontent.com *.googleusercontent.com",
              "connect-src 'self' *.supabase.co *.railway.app *.mongodb.net *.groq.com wss:",
              "frame-src 'self' *.youtube.com *.vimeo.com",
              "media-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  
  // =================================
  // Redirects and Rewrites
  // =================================
  
  async redirects() {
    return [
      // Redirect old routes to new ones
      {
        source: '/dashboard',
        destination: '/dashboard/chat',
        permanent: false,
      },
      {
        source: '/app/:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
    ];
  },
  
  async rewrites() {
    return [
      // API rewrites for better URL structure
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/v1/:path*`,
      },
    ];
  },
  
  // =================================
  // Webpack Configuration
  // =================================
  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack configurations
    
    // Optimize bundle splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
          },
        },
      },
    };
    
    // Add support for Monaco Editor
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: { loader: 'worker-loader' },
    });
    
    // Handle WASM files for AI models
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    // Resolve fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /node_modules\/express\/lib\/view\.js/ },
      { module: /node_modules\/mongodb/ },
    ];
    
    return config;
  },
  
  // =================================
  // Output Configuration
  // =================================
  
  // Custom build directory
  distDir: '.next',
  
  // =================================
  // Development Configuration
  // =================================
  
  // Development-specific settings
  ...(process.env.NODE_ENV === 'development' && {
    // Disable type checking in development for faster builds
    typescript: {
      ignoreBuildErrors: false,
    },
    
    // ESLint configuration
    eslint: {
      ignoreDuringBuilds: false,
      dirs: ['src'],
    },
  }),
  
  // =================================
  // Production Configuration
  // =================================
  
  ...(process.env.NODE_ENV === 'production' && {
    // Production optimizations
    compress: true,
    
    // Enable source maps for error tracking
    productionBrowserSourceMaps: true,
    
    // Strict type checking in production
    typescript: {
      ignoreBuildErrors: false,
    },
  }),
  
  // =================================
  // Custom Page Extensions
  // =================================
  
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  
  // =================================
  // Analytics Configuration
  // =================================
  
  // Enable analytics
  analyticsId: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
};

// Apply bundle analyzer if enabled
module.exports = withBundleAnalyzer(nextConfig);