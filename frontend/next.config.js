/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is run separately in CI
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Typecheck is run separately in CI
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
