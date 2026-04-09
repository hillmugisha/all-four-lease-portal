import { NextRequest, NextResponse } from 'next/server'
import { renderLease } from '@/lib/lease-renderer'
import { recordToTemplateData } from '@/lib/lease-adapter'
import { LeaseRecord } from '@/lib/types'

/**
 * POST /api/generate-pdf
 * Body: { record: LeaseRecord }
 * Returns: PDF binary as application/pdf
 */
export async function POST(req: NextRequest) {
  try {
    const { record } = (await req.json()) as { record: LeaseRecord }

    // Render the Handlebars template to HTML
    const html = renderLease(recordToTemplateData(record))

    // Launch headless Chrome and print to PDF
    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    const filename = `lease-${record.lessee_name.replace(/\s+/g, '-')}-${record.vehicle_vin}.pdf`

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
