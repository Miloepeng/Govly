/** @type {import('next').NextConfig} */
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const nextConfig = {
  async rewrites() {
    // Use environment variable or fallback to localhost for development
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ]
  },
}

module.exports = nextConfig 