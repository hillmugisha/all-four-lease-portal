/**
 * POST /api/send-lease-schedule-to-docusign
 *
 * 1. Saves the Lease Schedule record to Supabase (doc_status = 'sent').
 * 2. Generates the PDF with Puppeteer.
 * 3. Creates a DocuSign envelope with anchor-based signature tabs.
 *    Anchor strings in templates/lease-schedule.html:
 *      \ls_lessee_sign\     \ls_lessee_date\
 *      \ls_co_lessee_sign\  \ls_co_lessee_date\   (optional)
 *      \ls_lessor_sign\     \ls_lessor_date\
 * 4. Updates the Supabase record with the envelope ID.
 * 5. Returns { envelopeId, scheduleId }.
 */
import { NextRequest, NextResponse } from 'next/server'
import docusign from 'docusign-esign'
import { getDocuSignClient, getAccountId } from '@/lib/docusign'
import { renderLeaseSchedule } from '@/lib/lease-schedule-renderer'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type {
  LeaseScheduleFormData,
  LeaseScheduleTemplateData,
  LeaseScheduleRecord,
} from '@/lib/lease-schedule-types'
import { parseBody, LeaseScheduleFormDataBodySchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// ─── Build template data from form ───────────────────────────────────────────

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
      schedule_date:    raw.scheduleDate   || new Date().toISOString().slice(0, 10),
      master_lease_ref: raw.masterLeaseRef || null,
    },
    vehicles: raw.vehicles ?? [],
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

// ─── Build DB record from form ────────────────────────────────────────────────

function buildRecord(raw: LeaseScheduleFormData): Omit<LeaseScheduleRecord, 'id' | 'created_at'> {
  const primary  = raw.lesseeSignatories?.[0]
  const coLessee = raw.lesseeSignatories?.[1]
  const lesseeName = raw.lesseeType === 'individual'
    ? `${raw.lesseeFirstName ?? ''} ${raw.lesseeLastName ?? ''}`.trim()
    : raw.lesseeName ?? ''

  return {
    lessor_name:    raw.lessorName    || null,
    lessor_address: raw.lessorAddress || null,
    lessor_po_box:  raw.lessorPoBox   || null,
    lessor_city:    raw.lessorCity    || null,
    lessor_state:   (raw.lessorState ?? '').toUpperCase() || null,
    lessor_zip:     raw.lessorZip     || null,

    lessee_name:       lesseeName || null,
    lessee_type:       raw.lesseeType || null,
    lessee_first_name: raw.lesseeFirstName || null,
    lessee_last_name:  raw.lesseeLastName  || null,
    lessee_location:   raw.location        || null,
    lessee_address:    raw.address         || null,
    lessee_city:       raw.city            || null,
    lessee_state:      (raw.state ?? '').toUpperCase() || null,
    lessee_zip:        raw.zip             || null,
    lessee_phone:      raw.phone           || null,
    lessee_email:      raw.email           || null,

    lease_type:         raw.leaseType         || null,
    contract_structure: raw.contractStructure  || null,
    customer_type:      raw.customerType       || null,
    vehicle_use:        raw.vehicleUse         || null,
    department:         raw.department         || null,
    department_other:   raw.departmentOther    || null,

    vehicles_json: raw.vehicles ? JSON.stringify(raw.vehicles) : null,

    lessor_signer_name:   raw.lessorSignatoryName  || null,
    lessor_signer_email:  raw.lessorSignatoryEmail || null,
    lessor_signer_title:  raw.lessorSignatoryTitle || null,
    customer_signer_name: primary
      ? `${primary.firstName} ${primary.lastName}`.trim()
      : null,
    customer_signer_email: primary?.email || null,
    co_lessee_signer_name: coLessee?.firstName
      ? `${coLessee.firstName} ${coLessee.lastName}`.trim()
      : null,

    mla_id:           raw.mla_id          || null,
    master_lease_ref: raw.masterLeaseRef  || null,
    schedule_date:    raw.scheduleDate    || null,

    docusign_envelope_id: null,
    doc_status:           'sent',
    is_active:            false,
    signed_at:            null,
  }
}

// ─── DocuSign tab helpers ─────────────────────────────────────────────────────

function signTab(anchorString: string): docusign.SignHere {
  return {
    anchorString,
    anchorXOffset:            '0',
    anchorYOffset:            '-18',
    anchorUnits:              'pixels',
    anchorIgnoreIfNotPresent: 'true',
  }
}

function dateTab(anchorString: string): docusign.DateSigned {
  return {
    anchorString,
    anchorXOffset:            '120',
    anchorYOffset:            '-4',
    anchorUnits:              'pixels',
    anchorIgnoreIfNotPresent: 'true',
  }
}

// ─── PDF generation helper ────────────────────────────────────────────────────

async function renderToPdf(html: string): Promise<Buffer> {
  const { launchBrowser } = await import('@/lib/browser')
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const parsed = parseBody(LeaseScheduleFormDataBodySchema, await req.json())
    if (!parsed.ok) return parsed.response
    const { formData } = parsed.data

    // 1. Build and save DB record
    const record = buildRecord(formData)
    const { data: saved, error: insertError } = await getSupabaseAdmin()
      .from('lease_schedules')
      .insert(record)
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    const savedRecord = saved as LeaseScheduleRecord

    // 2. Generate PDF
    const templateData = buildTemplateData(formData)
    const html = renderLeaseSchedule(templateData)
    const pdfBytes = await renderToPdf(html)

    // 3. Build DocuSign envelope
    const apiClient = await getDocuSignClient()
    const accountId = getAccountId()

    const primary  = formData.lesseeSignatories?.[0]
    const coLessee = formData.lesseeSignatories?.[1]

    const lesseeName  = templateData.lessee.name
    const lesseeEmail = primary?.email || formData.email

    const docs: docusign.Document[] = [{
      documentBase64: pdfBytes.toString('base64'),
      name:           `Lease Schedule — ${lesseeName}`,
      fileExtension:  'pdf',
      documentId:     '1',
    }]

    const signers: docusign.Signer[] = []
    let nextId = 1

    // Signer 1: primary lessee (routing order 1)
    signers.push({
      email:        lesseeEmail,
      name:         lesseeName,
      recipientId:  String(nextId++),
      routingOrder: '1',
      tabs: {
        signHereTabs:   [signTab('\\ls_lessee_sign\\')],
        dateSignedTabs: [dateTab('\\ls_lessee_date\\')],
      },
    })

    // Co-lessee (routing order 1 — signs in parallel)
    if (coLessee?.firstName && coLessee?.email) {
      const coName = `${coLessee.firstName} ${coLessee.lastName}`.trim()
      signers.push({
        email:        coLessee.email,
        name:         coName,
        recipientId:  String(nextId++),
        routingOrder: '1',
        tabs: {
          signHereTabs:   [signTab('\\ls_co_lessee_sign\\')],
          dateSignedTabs: [dateTab('\\ls_co_lessee_date\\')],
        },
      })
    }

    // Lessor (routing order 2 — counter-signs after lessee)
    if (formData.lessorSignatoryEmail && formData.lessorSignatoryName) {
      signers.push({
        email:        formData.lessorSignatoryEmail,
        name:         formData.lessorSignatoryName,
        recipientId:  String(nextId),
        routingOrder: '2',
        tabs: {
          signHereTabs:   [signTab('\\ls_lessor_sign\\')],
          dateSignedTabs: [dateTab('\\ls_lessor_date\\')],
        },
      })
    }

    const envelopeDefinition: docusign.EnvelopeDefinition = {
      emailSubject: `Please sign the Lease Schedule — ${lesseeName}`,
      documents:    docs,
      recipients:   { signers },
      status:       'sent',
    }

    const envelopesApi = new docusign.EnvelopesApi(apiClient)
    const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })

    if (!result.envelopeId) throw new Error('DocuSign did not return an envelope ID')
    const envelopeId = result.envelopeId

    // 4. Persist envelope ID
    await getSupabaseAdmin()
      .from('lease_schedules')
      .update({ docusign_envelope_id: envelopeId, doc_status: 'sent' })
      .eq('id', savedRecord.id)

    return NextResponse.json({ envelopeId, scheduleId: savedRecord.id }, { status: 201 })
  } catch (err) {
    console.error('[send-lease-schedule-to-docusign]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
