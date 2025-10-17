/** @type {import('next').NextConfig} */
const nextConfig = {
  // Memory optimization settings
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Webpack optimization for lower memory usage
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce memory during development
      config.optimization = {
        ...config.optimization,
        runtimeChunk: false,
        splitChunks: false,
      };
    }
    // Reduce parallelism
    config.parallelism = 1;
    return config;
  },

  // Disable source maps to save memory
  productionBrowserSourceMaps: false,

  // Use SWC minifier (faster, less memory)
  swcMinify: true,

  async rewrites() {
    return {
      beforeFiles: [
        // Only proxy specific backend API routes, not all /api routes
        // This allows Next.js API routes to work properly
        {
          source: '/api/health',
          destination: 'http://127.0.0.1:8000/api/health',
        },
        {
          source: '/api/analyze',
          destination: 'http://127.0.0.1:8000/api/analyze',
        },
        {
          source: '/api/query',
          destination: 'http://127.0.0.1:8000/api/query',
        },
      ],
    }
  },
}

module.exports = nextConfig
