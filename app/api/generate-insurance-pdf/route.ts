import { NextRequest, NextResponse } from 'next/server'
import { renderInsuranceAck } from '@/lib/lease-renderer'
import { recordToTemplateData } from '@/lib/lease-adapter'
import { LeaseRecord } from '@/lib/types'
import { parseBody } from '@/lib/validation'
import { z } from 'zod'

const GenerateInsurancePdfBodySchema = z.object({ record: z.record(z.unknown()) })

/**
 * POST /api/generate-insurance-pdf
 * Body: { record: LeaseRecord }
 * Returns: PDF binary as application/pdf
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = parseBody(GenerateInsurancePdfBodySchema, await req.json())
    if (!parsed.ok) return parsed.response
    const record = parsed.data.record as unknown as LeaseRecord

    const html = renderInsuranceAck(recordToTemplateData(record))

    const { launchBrowser } = await import('@/lib/browser')
    const browser = await launchBrowser()
    let pdf: Uint8Array
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'load' })
      pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
    } finally {
      await browser.close()
    }

    const filename = `insurance-ack-${record.lessee_name.replace(/\s+/g, '-')}-${record.vehicle_vin}.pdf`

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('Insurance PDF generation error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
