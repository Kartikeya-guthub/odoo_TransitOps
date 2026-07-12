/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      {
        source: '/finances',
        destination: '/fuel-expenses',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
