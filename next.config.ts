import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow static images from /public/garments without next/image restrictions
  images: {
    unoptimized: true,
  },
}

export default nextConfig
