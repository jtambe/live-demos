/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
        },
      ],
    }
  },
}

module.exports = nextConfig
