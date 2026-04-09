/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'handlebars', 'puppeteer'],
  },
}

export default nextConfig
