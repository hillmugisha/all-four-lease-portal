/**
 * POST /api/send-to-docusign
 *
 * 1. Accepts the full LeaseFormData from the Signatures step.
 * 2. Saves the lease record to Supabase (doc_status = 'sent').
 * 3. Generates the PDF with Puppeteer (same renderer as generate-pdf).
 * 4. Creates a DocuSign envelope with 3 signers and anchor-based signature tabs.
 * 5. Updates the Supabase record with the returned envelope ID.
 * 6. Returns { envelopeId, leaseId } to the client.
 *
 * Anchor strings placed in templates/lease.html:
 *   \lessee1_sign\   \lessee1_date\
 *   \colessee_sign\  \colessee_date\
 *   \lessor_sign\    \lessor_date\
 */
import { NextRequest, NextResponse } from 'next/server'
import docusign from 'docusign-esign'
import { getDocuSignClient, getAccountId } from '@/lib/docusign'
import { renderLease } from '@/lib/lease-renderer'
import { recordToTemplateData } from '@/lib/lease-adapter'
import { calculateLease } from '@/lib/calculations'
import { getSupabase } from '@/lib/supabase'
import type { LeaseFormData, FinancialInputs, LeaseRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'

// ─── Helper: build a LeaseRecord from form data ───────────────────────────────

function buildRecord(raw: LeaseFormData): Omit<LeaseRecord, 'id' | 'created_at' | 'updated_at'> {
  const fi: FinancialInputs = {
    leaseDate:             raw.leaseDate,
    numPayments:           Number(raw.numPayments),
    firstPaymentDate:      raw.firstPaymentDate,
    paymentDay:            Number(raw.paymentDay),
    vehicleAgreedValue:    Number(raw.vehicleAgreedValue),
    taxes:                 Number(raw.taxes),
    titleRegFees:          Number(raw.titleRegFees),
    acquisitionFee:        Number(raw.acquisitionFee),
    docFee:                Number(raw.docFee),
    priorLeaseBalance:     Number(raw.priorLeaseBalance ?? 0),
    optionalProducts:      Number(raw.optionalProducts ?? 0),
    capCostReduction:      Number(raw.capCostReduction ?? 0),
    residualValue:         Number(raw.residualValue),
    rentCharge:            Number(raw.rentCharge),
    monthlySalesTax:       Number(raw.monthlySalesTax ?? 0),
    milesPerYear:          Number(raw.milesPerYear),
    excessMileageRate:     Number(raw.excessMileageRate),
    dispositionFee:        Number(raw.dispositionFee ?? 195),
    earlyTerminationFee:   Number(raw.earlyTerminationFee ?? 0),
    purchaseOptionFee:     Number(raw.purchaseOptionFee ?? 0),
    tradeinYear:           raw.tradeinYear ?? '',
    tradeinMake:           raw.tradeinMake ?? '',
    tradeinModel:          raw.tradeinModel ?? '',
    tradeinGrossAllowance: Number(raw.tradeinGrossAllowance ?? 0),
    tradeinPriorBalance:   Number(raw.tradeinPriorBalance ?? 0),
    customerSignerName:    raw.customerSignerName ?? '',
    customerSignerEmail:   raw.customerSignerEmail ?? '',
  }
  const c = calculateLease(fi)

  const primary   = raw.lesseeSignatories?.[0]
  const coLessee  = raw.lesseeSignatories?.[1]

  return {
    doc_status: 'sent',

    lessor_name:    raw.lessorName,
    lessor_address: raw.lessorAddress,
    lessor_po_box:  raw.lessorPoBox || null,
    lessor_city:    raw.lessorCity,
    lessor_state:   (raw.lessorState ?? '').toUpperCase(),
    lessor_zip:     raw.lessorZip,

    lessee_name:    raw.lesseeName,
    lessee_address: raw.address,
    lessee_city:    raw.city,
    lessee_state:   (raw.state ?? '').toUpperCase(),
    lessee_zip:     raw.zip,
    lessee_phone:   raw.phone || null,
    lessee_email:   raw.email,

    lease_date: raw.leaseDate,

    vehicle_condition:  raw.condition,
    vehicle_year:       raw.year,
    vehicle_make:       raw.make,
    vehicle_model:      raw.model,
    vehicle_body_style: raw.bodyStyle,
    vehicle_vin:        raw.vin ? raw.vin.toUpperCase() : '',
    vehicle_odometer:   raw.odometer || null,

    vehicle_agreed_value:  Number(raw.vehicleAgreedValue),
    taxes:                 Number(raw.taxes),
    title_reg_fees:        Number(raw.titleRegFees),
    acquisition_fee:       Number(raw.acquisitionFee),
    doc_fee:               Number(raw.docFee),
    prior_lease_balance:   Number(raw.priorLeaseBalance ?? 0),
    optional_products:     Number(raw.optionalProducts ?? 0),
    cap_cost_reduction:    Number(raw.capCostReduction ?? 0),
    residual_value:        Number(raw.residualValue),
    rent_charge:           Number(raw.rentCharge),
    num_payments:          Number(raw.numPayments),
    monthly_sales_tax:     Number(raw.monthlySalesTax ?? 0),
    first_payment_date:    raw.firstPaymentDate,
    payment_day:           Number(raw.paymentDay),
    miles_per_year:        Number(raw.milesPerYear),
    excess_mileage_rate:   Number(raw.excessMileageRate),
    disposition_fee:       Number(raw.dispositionFee ?? 195),
    early_termination_fee: Number(raw.earlyTerminationFee ?? 0),
    purchase_option_fee:   Number(raw.purchaseOptionFee ?? 0),

    tradein_year:            raw.tradeinYear || null,
    tradein_make:            raw.tradeinMake || null,
    tradein_model:           raw.tradeinModel || null,
    tradein_gross_allowance: Number(raw.tradeinGrossAllowance ?? 0),
    tradein_prior_balance:   Number(raw.tradeinPriorBalance ?? 0),

    gross_cap_cost:              c.grossCapCost,
    net_tradein_allowance:       c.netTradeinAllowance,
    adjusted_cap_cost:           c.adjustedCapCost,
    depreciation:                c.depreciation,
    total_base_monthly_payments: c.totalBaseMonthlyPayments,
    base_monthly_payment:        c.baseMonthlyPayment,
    total_monthly_payment:       c.totalMonthlyPayment,
    total_of_payments:           c.totalOfPayments,
    amount_due_at_signing:       c.amountDueAtSigning,
    official_fees_taxes:         c.officialFeesTaxes,

    lessor_signer_title: raw.lessorSignatoryTitle || null,
    lessor_signer_name:  raw.lessorSignatoryName  || null,
  }
}

// ─── Helper: generate PDF bytes ───────────────────────────────────────────────

async function generatePdf(record: LeaseRecord): Promise<Buffer> {
  const html = renderLease(recordToTemplateData(record))

  const puppeteer = await import('puppeteer')
  const browser   = await puppeteer.default.launch({
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

  return Buffer.from(pdf)
}

// ─── Helper: build a DocuSign SignHere tab using an anchor string ─────────────

function signTab(anchorString: string): docusign.SignHere {
  return {
    anchorString,
    anchorXOffset:          '0',
    anchorYOffset:          '-32', // place widget above the anchor text, on the sig-line
    anchorUnits:            'pixels',
    anchorIgnoreIfNotPresent: 'true', // skip tab gracefully if anchor not found (e.g. no co-lessee)
  }
}

function dateTab(anchorString: string): docusign.DateSigned {
  return {
    anchorString,
    anchorXOffset:          '120',
    anchorYOffset:          '-4',
    anchorUnits:            'pixels',
    anchorIgnoreIfNotPresent: 'true',
  }
}

// ─── Helper: create and send the DocuSign envelope ───────────────────────────

async function createEnvelope(
  pdfBytes: Buffer,
  raw: LeaseFormData,
  record: LeaseRecord,
): Promise<string> {
  const apiClient = await getDocuSignClient()
  const accountId = getAccountId()

  const primary  = raw.lesseeSignatories?.[0]
  const coLessee = raw.lesseeSignatories?.[1]

  const lesseeName  = primary
    ? `${primary.firstName} ${primary.lastName}`.trim()
    : record.lessee_name
  const lesseeEmail = primary?.email || record.lessee_email

  // ── Document ──
  const document: docusign.Document = {
    documentBase64: pdfBytes.toString('base64'),
    name:           `Lease Agreement — ${lesseeName}`,
    fileExtension:  'pdf',
    documentId:     '1',
  }

  // ── Signer 1: primary lessee (routing order 1) ──
  const signer1: docusign.Signer = {
    email:       lesseeEmail,
    name:        lesseeName,
    recipientId: '1',
    routingOrder: '1',
    tabs: {
      signHereTabs: [signTab('\\lessee1_sign\\')],
      dateSignedTabs: [dateTab('\\lessee1_date\\')],
    },
  }

  const signers: docusign.Signer[] = [signer1]
  let nextId = 2

  // ── Co-lessee (routing order 1 — signs in parallel with primary) ──
  // Only added when the form has a second signatory with name + email filled in.
  if (coLessee?.firstName && coLessee?.email) {
    const coName = `${coLessee.firstName} ${coLessee.lastName}`.trim()
    signers.push({
      email:        coLessee.email,
      name:         coName,
      recipientId:  String(nextId++),
      routingOrder: '1',
      tabs: {
        signHereTabs:   [signTab('\\colessee_sign\\')],
        dateSignedTabs: [dateTab('\\colessee_date\\')],
      },
    })
  }

  // ── Lessor (routing order 2 — counter-signs after lessee(s) complete) ──
  const lessorEmail = raw.lessorSignatoryEmail
  const lessorName  = raw.lessorSignatoryName || record.lessor_name

  if (lessorEmail && lessorName) {
    signers.push({
      email:        lessorEmail,
      name:         lessorName,
      recipientId:  String(nextId),
      routingOrder: '2',
      tabs: {
        signHereTabs:   [signTab('\\lessor_sign\\')],
        dateSignedTabs: [dateTab('\\lessor_date\\')],
      },
    })
  }

  // ── Envelope ──
  const envelopeDefinition: docusign.EnvelopeDefinition = {
    emailSubject: `Please sign your lease agreement — ${record.vehicle_year} ${record.vehicle_make} ${record.vehicle_model}`,
    documents:    [document],
    recipients: {
      signers,
    },
    status: 'sent', // 'sent' delivers immediately; use 'created' for a draft
  }

  const envelopesApi = new docusign.EnvelopesApi(apiClient)
  const result = await envelopesApi.createEnvelope(accountId, {
    envelopeDefinition,
  })

  if (!result.envelopeId) throw new Error('DocuSign did not return an envelope ID')
  return result.envelopeId
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { formData } = (await req.json()) as { formData: LeaseFormData }

    // 1. Build the record shape from form data
    const recordData = buildRecord(formData)

    // 2. Save to Supabase first so we have an ID even if DocuSign fails
    const { data: saved, error: insertError } = await getSupabase()
      .from('leases')
      .insert(recordData)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const savedRecord = saved as LeaseRecord

    // 3. Inject co-lessee name into the record for PDF rendering only
    //    (the column doesn't exist in the DB — we use formData as the source)
    const coLesseeEntry = formData.lesseeSignatories?.[1]
    const pdfRecord: LeaseRecord = {
      ...savedRecord,
      co_lessee_signer_name: coLesseeEntry?.firstName
        ? `${coLesseeEntry.firstName} ${coLesseeEntry.lastName}`.trim() || null
        : null,
    }

    // 4. Generate PDF bytes (using the enriched in-memory record)
    const pdfBytes = await generatePdf(pdfRecord)

    // 5. Create DocuSign envelope
    const envelopeId = await createEnvelope(pdfBytes, formData, savedRecord)

    // 5. Persist envelope ID and mark as sent
    await getSupabase()
      .from('leases')
      .update({ doc_status: 'sent', docusign_envelope_id: envelopeId })
      .eq('id', savedRecord.id)

    return NextResponse.json({ envelopeId, leaseId: savedRecord.id }, { status: 201 })
  } catch (err) {
    console.error('[send-to-docusign]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
