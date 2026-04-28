import { NextRequest, NextResponse } from 'next/server'
import { renderLeaseSchedule } from '@/lib/lease-schedule-renderer'
import type { LeaseScheduleTemplateData, LeaseScheduleFormData } from '@/lib/lease-schedule-types'

export const dynamic = 'force-dynamic'

function buildTemplateData(raw: LeaseScheduleFormData): LeaseScheduleTemplateData {
  const primary  = raw.lesseeSignatories?.[0]
  const coLessee = raw.lesseeSignatories?.[1]

  const lesseeName = raw.lesseeType === 'individual'
    ? `${raw.lesseeFirstName ?? ''} ${raw.lesseeLastName ?? ''}`.trim()
    : raw.lesseeName ?? ''

  return {
    lessor: {
      name:    raw.lessorName    || '',
      address: raw.lessorAddress || '',
      po_box:  raw.lessorPoBox   || null,
      city:    raw.lessorCity    || '',
      state:   raw.lessorState   || '',
      zip:     raw.lessorZip     || '',
    },
    lessee: {
      name:    lesseeName,
      address: raw.address || '',
      city:    raw.city    || '',
      state:   raw.state   || '',
      zip:     raw.zip     || '',
      phone:   raw.phone   || null,
      email:   raw.email   || '',
    },
    schedule: {
      schedule_date:    raw.scheduleDate    || new Date().toISOString().slice(0, 10),
      master_lease_ref: raw.masterLeaseRef  || null,
    },
    vehicles: (raw.vehicles ?? []).map(v => ({
      ...v,
      term:            Number(v.term)            || 0,
      net_cap_cost:    Number(v.net_cap_cost)    || 0,
      monthly_payment: Number(v.monthly_payment) || 0,
      residual_value:  Number(v.residual_value)  || 0,
    })),
    signatures: {
      lessee_signer_name:    primary ? `${primary.firstName} ${primary.lastName}`.trim() : '',
      lessee_signer_title:   primary?.jobTitle || null,
      co_lessee_signer_name: coLessee?.firstName
        ? `${coLessee.firstName} ${coLessee.lastName}`.trim()
        : null,
      lessor_name:         raw.lessorName          || '',
      lessor_signer_name:  raw.lessorSignatoryName  || '',
      lessor_signer_title: raw.lessorSignatoryTitle || '',
    },
  }
}

/**
 * POST /api/generate-lease-schedule-pdf
 * Body: { formData: LeaseScheduleFormData }
 * Returns: PDF binary as application/pdf
 */
export async function POST(req: NextRequest) {
  try {
    const { formData } = (await req.json()) as { formData: LeaseScheduleFormData }
    const templateData = buildTemplateData(formData)
    const html = renderLeaseSchedule(templateData)

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

    const lesseeName = templateData.lessee.name || 'unknown'
    const filename = `lease-schedule-${lesseeName.replace(/\s+/g, '-')}.pdf`

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[generate-lease-schedule-pdf]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
