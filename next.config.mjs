/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'handlebars', 'puppeteer', 'docusign-esign'],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/current-leases',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
