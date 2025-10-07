/** @type {import('next').NextConfig} */
const nextConfig = {
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
