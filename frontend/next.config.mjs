/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance Optimizations
  reactStrictMode: true,
  swcMinify: true,
  compress: true,

  // Production optimizations
  productionBrowserSourceMaps: false,
  optimizeFonts: true,

  // Memory and performance optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'framer-motion',
      'recharts',
    ],
    // Enable modern bundling
    webpackBuildWorker: true,
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [
      'localhost',
      'zsevvvaakunsspxpplbh.supabase.co',
    ],
  },

  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // OPTIMIZATION: Dev memory reduction (from optimization plan)
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: false,
        splitChunks: false,
      };
      // Reduce parallelism to save RAM
      config.parallelism = 1;
    }

    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Framework chunk (React, Next.js)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI libraries chunk
            lib: {
              test: /[\\/]node_modules[\\/](@radix-ui|framer-motion|recharts)[\\/]/,
              name: 'lib',
              priority: 30,
            },
          },
        },
      };

      // Minimize bundle size
      config.performance = {
        maxAssetSize: 512000,
        maxEntrypointSize: 512000,
        hints: 'warning',
      };
    }

    return config;
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'Engunity AI',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Output configuration
  output: 'standalone', // For Docker optimization
  poweredByHeader: false,

  // Redirects and rewrites
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
