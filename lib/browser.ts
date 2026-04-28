import type { Browser } from 'puppeteer-core'

export async function launchBrowser(): Promise<Browser> {
  const puppeteerCore = (await import('puppeteer-core')).default

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const chromium = (await import('@sparticuz/chromium-min')).default
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(
        process.env.CHROMIUM_PACK_URL
      ),
      headless: 'shell',
    })
  }

  return puppeteerCore.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    channel: 'chrome',
  })
}
