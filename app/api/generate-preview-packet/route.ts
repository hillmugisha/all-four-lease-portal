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
    const { record, selectedDocs = { lease: true, insurance: true, ach: true } } =
      (await req.json()) as {
        record: LeaseRecord
        selectedDocs?: { lease: boolean; insurance: boolean; ach: boolean }
      }

    const templateData = recordToTemplateData(record)
    const htmlLease     = record.is_master_lease
      ? renderMasterLease(templateData)
      : renderLease(templateData)
    const htmlInsurance = selectedDocs.insurance ? renderInsuranceAck(templateData) : null
    const htmlAch       = selectedDocs.ach       ? renderAchAuthorizationForLessor(templateData) : null

    // Launch a single browser and render selected pages in parallel
    const { launchBrowser } = await import('@/lib/browser')
    const browser = await launchBrowser()

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

    const htmlPages = ([htmlLease, htmlInsurance, htmlAch] as (string | null)[])
    let renderedPdfs: (Buffer | null)[]
    try {
      renderedPdfs = await Promise.all(
        htmlPages.map((html) => html ? renderPage(html) : Promise.resolve(null))
      )
    } finally {
      await browser.close()
    }

    // Merge only selected PDFs into one packet using pdf-lib
    const merged = await PDFDocument.create()

    for (const pdfBytes of renderedPdfs.filter((b): b is Buffer => b !== null)) {
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
