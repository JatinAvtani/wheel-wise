/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsHmrCache: false, // defaults to true
  },
  // Linting runs as its own CI job (`npm run lint`); `next build`'s built-in
  // ESLint step uses different machinery that's currently broken under this
  // Next.js/ESLint flat-config combination (see README).
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ymqpkygmownybanldbpq.supabase.co",
      },
    ],
  },
};

export default nextConfig;
