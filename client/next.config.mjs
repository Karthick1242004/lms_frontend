/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
      },
      {
        protocol: 'https',
        hostname: 'folio-lynkr-main.vercel.app',
      },
    ],
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
}

// Try to load user config if it exists
let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
  
  // Merge user config if it exists
  if (userConfig) {
    for (const key in userConfig) {
      if (
        typeof nextConfig[key] === 'object' &&
        !Array.isArray(nextConfig[key])
      ) {
        nextConfig[key] = {
          ...nextConfig[key],
          ...userConfig[key],
        }
      } else {
        nextConfig[key] = userConfig[key]
      }
    }
  }
} catch (e) {
  // Ignore error if user config doesn't exist
}

export default nextConfig
