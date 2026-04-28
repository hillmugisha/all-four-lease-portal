/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'handlebars', 'puppeteer-core', '@sparticuz/chromium-min', 'docusign-esign'],
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
