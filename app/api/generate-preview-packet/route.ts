import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { renderLease, renderMasterLease, renderInsuranceAck, renderAchAuthorizationForLessor } from '@/lib/lease-renderer'
import { recordToTemplateData } from '@/lib/lease-adapter'
import type { LeaseRecord } from '@/lib/types'

/**
 * POST /api/generate-preview-packet
 * Body: { record: LeaseRecord }
 * Returns: single merged PDF (Lease → Insurance Ack → ACH Authorization)
 */
export async function POST(req: NextRequest) {
  try {
    const { record } = (await req.json()) as { record: LeaseRecord }

    const templateData = recordToTemplateData(record)
    const htmlLease     = record.is_master_lease
      ? renderMasterLease(templateData)
      : renderLease(templateData)
    const htmlInsurance = renderInsuranceAck(templateData)
    const htmlAch       = renderAchAuthorizationForLessor(templateData)

    // Launch a single browser and render all three pages in parallel
    const puppeteer = await import('puppeteer')
    const browser   = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const renderPage = async (html: string): Promise<Buffer> => {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      const pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
      await page.close()
      return Buffer.from(pdf)
    }

    const [pdfLease, pdfInsurance, pdfAch] = await Promise.all([
      renderPage(htmlLease),
      renderPage(htmlInsurance),
      renderPage(htmlAch),
    ])

    await browser.close()

    // Merge all three PDFs into one packet using pdf-lib
    const merged = await PDFDocument.create()

    for (const pdfBytes of [pdfLease, pdfInsurance, pdfAch]) {
      const doc   = await PDFDocument.load(pdfBytes)
      const pages = await merged.copyPages(doc, doc.getPageIndices())
      pages.forEach(page => merged.addPage(page))
    }

    const mergedBytes = await merged.save()

    const lessee   = (record.lessee_name  ?? 'unknown').replace(/\s+/g, '-')
    const vin      = record.vehicle_vin   ?? 'unknown'
    const filename = `preview-packet-${lessee}-${vin}.pdf`

    return new NextResponse(Buffer.from(mergedBytes), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('Preview packet generation error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
