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
import { logAudit } from '@/lib/audit'
import { getUserEmailFromRequest } from '@/lib/auth-user'
import { getDocuSignClient, getAccountId } from '@/lib/docusign'
import { renderLease, renderMasterLease, renderInsuranceAck, renderAchAuthorizationForLessor } from '@/lib/lease-renderer'
import { recordToTemplateData } from '@/lib/lease-adapter'
import { calculateLease } from '@/lib/calculations'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { LeaseFormData, FinancialInputs, LeaseRecord } from '@/lib/types'
import { parseBody, SendToDocusignBodySchema } from '@/lib/validation'

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

    lessee_name:       raw.lesseeType === 'individual'
                         ? `${raw.lesseeFirstName ?? ''} ${raw.lesseeLastName ?? ''}`.trim()
                         : raw.lesseeName ?? '',
    lessee_type:       raw.lesseeType || 'business',
    lessee_first_name: raw.lesseeFirstName  || null,
    lessee_last_name:  raw.lesseeLastName   || null,
    lessee_location:   raw.location         || null,
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

    lessor_signer_title:   raw.lessorSignatoryTitle            || null,
    lessor_signer_name:    raw.lessorSignatoryName             || null,
    customer_signer_title: raw.lesseeSignatories?.[0]?.jobTitle || null,

    is_master_lease: raw.is_master_lease ?? false,
    vehicles_json:   raw.vehicles_json   || null,
  }
}

// ─── Helper: generate PDF bytes from HTML ─────────────────────────────────────

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

async function generatePdf(record: LeaseRecord): Promise<Buffer> {
  const templateData = recordToTemplateData(record)
  const html = record.is_master_lease
    ? renderMasterLease(templateData)
    : renderLease(templateData)
  return renderToPdf(html)
}

async function generateInsurancePdf(record: LeaseRecord): Promise<Buffer> {
  return renderToPdf(renderInsuranceAck(recordToTemplateData(record)))
}

async function generateAchPdf(record: LeaseRecord): Promise<Buffer> {
  return renderToPdf(renderAchAuthorizationForLessor(recordToTemplateData(record)))
}

// ─── Helper: build DocuSign tab using an anchor string ───────────────────────

function signTab(anchorString: string, documentId?: string): docusign.SignHere {
  return {
    anchorString,
    anchorXOffset:            '0',
    anchorYOffset:            '-18',
    anchorUnits:              'pixels',
    anchorIgnoreIfNotPresent: 'true',
    ...(documentId ? { documentId } : {}),
  }
}

function dateTab(anchorString: string, documentId?: string): docusign.DateSigned {
  return {
    anchorString,
    anchorXOffset:            '120',
    anchorYOffset:            '-4',
    anchorUnits:              'pixels',
    anchorIgnoreIfNotPresent: 'true',
    ...(documentId ? { documentId } : {}),
  }
}

function textTab(anchorString: string, documentId?: string, required = false): docusign.Text {
  return {
    anchorString,
    anchorXOffset:            '4',
    anchorYOffset:            '-2',
    anchorUnits:              'pixels',
    anchorIgnoreIfNotPresent: 'true',
    required:                 required ? 'true' : 'false',
    ...(documentId ? { documentId } : {}),
  }
}

// ─── Helper: create and send the DocuSign envelope ───────────────────────────

async function createEnvelope(
  leasePdfBytes: Buffer,
  insurancePdfBytes: Buffer | null,
  achPdfBytes: Buffer | null,
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
  const isMasterLease = !!record.is_master_lease

  // ── Build document list with dynamic IDs based on what was selected ──
  const docs: docusign.Document[] = []
  let counter = 1

  const leaseDocId = String(counter++)
  docs.push({
    documentBase64: leasePdfBytes.toString('base64'),
    name:           isMasterLease
      ? `Master Vehicle Lease Agreement — ${record.lessee_name}`
      : `Lease Agreement — ${lesseeName}`,
    fileExtension:  'pdf',
    documentId:     leaseDocId,
  })

  const insuranceDocId = insurancePdfBytes ? String(counter++) : null
  if (insurancePdfBytes && insuranceDocId) {
    docs.push({
      documentBase64: insurancePdfBytes.toString('base64'),
      name:           `Insurance Acknowledgement — ${lesseeName}`,
      fileExtension:  'pdf',
      documentId:     insuranceDocId,
    })
  }

  const achDocId = achPdfBytes ? String(counter++) : null
  if (achPdfBytes && achDocId) {
    docs.push({
      documentBase64: achPdfBytes.toString('base64'),
      name:           `ACH Authorization — ${lesseeName}`,
      fileExtension:  'pdf',
      documentId:     achDocId,
    })
  }

  // ── Signer 1: primary lessee (routing order 1) ──
  const signer1: docusign.Signer = {
    email:        lesseeEmail,
    name:         lesseeName,
    recipientId:  '1',
    routingOrder: '1',
    tabs: {
      signHereTabs: [
        isMasterLease
          ? signTab('\\mla_lessee_sign\\', leaseDocId)
          : signTab('\\lessee1_sign\\',    leaseDocId),
        ...(insuranceDocId ? [signTab('\\ins_lessee1_sign\\', insuranceDocId)] : []),
        ...(achDocId       ? [signTab('\\ach_lessee_sign\\',  achDocId)]       : []),
      ],
      dateSignedTabs: [
        isMasterLease
          ? dateTab('\\mla_lessee_date\\', leaseDocId)
          : dateTab('\\lessee1_date\\',    leaseDocId),
        ...(insuranceDocId ? [dateTab('\\ins_lessee1_date\\', insuranceDocId)] : []),
        ...(achDocId       ? [dateTab('\\ach_lessee_date\\',  achDocId)]       : []),
      ],
      fullNameTabs: [
        ...(insuranceDocId ? [{
          anchorString:            '\\ins_printed_name\\',
          anchorXOffset:           '0',
          anchorYOffset:           '-4',
          anchorUnits:             'pixels',
          anchorIgnoreIfNotPresent:'true',
          documentId:              insuranceDocId,
          tabLabel:                'Printed Name of Lessee',
        }] : []),
      ],
      textTabs: [
        // Master lease adds lessee name + title fields on the lease doc
        ...(isMasterLease ? [
          { ...textTab('\\mla_lessee_name\\',  leaseDocId, true), tabLabel: 'MLA Lessee Print Name' },
          {
            ...textTab('\\mla_lessee_title\\', leaseDocId, true),
            tabLabel: 'MLA Lessee Title',
            ...(record.customer_signer_title ? { value: record.customer_signer_title } : {}),
          },
        ] : []),
        // ── Insurance Agent fields ──
        ...(insuranceDocId ? [
          { ...textTab('\\ins_agent_name\\',    insuranceDocId, true), tabLabel: 'Insurance Agent Name' },
          { ...textTab('\\ins_agent_address\\', insuranceDocId, true), tabLabel: 'Insurance Agent Address' },
          { ...textTab('\\ins_agent_city\\',    insuranceDocId, true), tabLabel: 'Insurance Agent City St Zip' },
          { ...textTab('\\ins_agent_phone\\',   insuranceDocId, true), tabLabel: 'Insurance Agent Phone' },
          { ...textTab('\\ins_co_name\\',       insuranceDocId, true), tabLabel: 'Insurance Company Name' },
          { ...textTab('\\ins_co_policy\\',     insuranceDocId, true), tabLabel: 'Insurance Policy Number' },
          { ...textTab('\\ins_co_effective\\',  insuranceDocId, true), tabLabel: 'Insurance Effective Date' },
          { ...textTab('\\ins_co_coverage\\',   insuranceDocId, true), tabLabel: 'Insurance Coverage Amount' },
        ] : []),
        // ── ACH Billing fields ──
        ...(achDocId ? [
          { ...textTab('\\ach_billing_address\\', achDocId, true),  tabLabel: 'ACH Billing Address',   width: '300', height: '16' },
          { ...textTab('\\ach_billing_city\\',    achDocId, true),  tabLabel: 'ACH City State Zip',     width: '300', height: '16' },
          { ...textTab('\\ach_billing_phone\\',   achDocId, true),  tabLabel: 'ACH Phone Number',       width: '160', height: '16' },
          { ...textTab('\\ach_billing_email\\',   achDocId, true),  tabLabel: 'ACH Email Address',      width: '240', height: '16' },
          { ...textTab('\\ach_num_payments\\',    achDocId, false), tabLabel: 'ACH Number of Payments', width: '60',  height: '16', value: String(record.num_payments), locked: 'true' },
          { ...textTab('\\ach_bank_name\\', achDocId, true), tabLabel: 'ACH Depository Bank',  width: '300', height: '16' },
          { ...textTab('\\ach_routing\\',   achDocId, true), tabLabel: 'ACH Routing Number',   width: '180', height: '16' },
          { ...textTab('\\ach_account\\',   achDocId, true), tabLabel: 'ACH Account Number',   width: '200', height: '16' },
        ] : []),
      ],
      radioGroupTabs: [
        ...(achDocId ? [
          {
            documentId: achDocId,
            groupName:  'ach_frequency',
            radios: [
              { anchorString: '\\ach_freq_weekly\\',   anchorXOffset: '0', anchorYOffset: '-2', anchorUnits: 'pixels', anchorIgnoreIfNotPresent: 'true', value: 'Weekly' },
              { anchorString: '\\ach_freq_monthly\\',  anchorXOffset: '0', anchorYOffset: '-2', anchorUnits: 'pixels', anchorIgnoreIfNotPresent: 'true', value: 'Monthly' },
              { anchorString: '\\ach_freq_annually\\', anchorXOffset: '0', anchorYOffset: '-2', anchorUnits: 'pixels', anchorIgnoreIfNotPresent: 'true', value: 'Annually' },
            ],
          },
          {
            documentId: achDocId,
            groupName:  'ach_account_type',
            radios: [
              { anchorString: '\\ach_account_type_checking\\', anchorXOffset: '0', anchorYOffset: '-2', anchorUnits: 'pixels', anchorIgnoreIfNotPresent: 'true', value: 'Checking' },
              { anchorString: '\\ach_account_type_savings\\',  anchorXOffset: '0', anchorYOffset: '-2', anchorUnits: 'pixels', anchorIgnoreIfNotPresent: 'true', value: 'Savings' },
            ],
          },
        ] : []),
      ],
    },
  }

  const signers: docusign.Signer[] = [signer1]
  let nextId = 2

  // ── Co-lessee (routing order 1 — signs in parallel with primary) ──
  if (coLessee?.firstName && coLessee?.email) {
    const coName = `${coLessee.firstName} ${coLessee.lastName}`.trim()
    signers.push({
      email:        coLessee.email,
      name:         coName,
      recipientId:  String(nextId++),
      routingOrder: '1',
      tabs: {
        signHereTabs:   [signTab('\\colessee_sign\\', leaseDocId)],
        dateSignedTabs: [dateTab('\\colessee_date\\', leaseDocId)],
      },
    })
  }

  // ── Lessor (routing order 2 — counter-signs lease only) ──
  const lessorEmail = raw.lessorSignatoryEmail
  const lessorName  = raw.lessorSignatoryName || record.lessor_name

  if (lessorEmail && lessorName) {
    signers.push({
      email:        lessorEmail,
      name:         lessorName,
      recipientId:  String(nextId),
      routingOrder: '2',
      tabs: {
        signHereTabs:   [isMasterLease ? signTab('\\mla_lessor_sign\\', leaseDocId) : signTab('\\lessor_sign\\', leaseDocId)],
        dateSignedTabs: [isMasterLease ? dateTab('\\mla_lessor_date\\', leaseDocId) : dateTab('\\lessor_date\\', leaseDocId)],
      },
    })
  }

  // ── Envelope ──
  const envelopeDefinition: docusign.EnvelopeDefinition = {
    emailSubject: isMasterLease
      ? `Please sign the Master Vehicle Lease Agreement — ${record.lessee_name}`
      : `Please sign your lease agreement — ${record.vehicle_year} ${record.vehicle_make} ${record.vehicle_model}`,
    documents:    docs,
    recipients:   { signers },
    status:       'sent',
  }

  const envelopesApi = new docusign.EnvelopesApi(apiClient)
  const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })

  if (!result.envelopeId) throw new Error('DocuSign did not return an envelope ID')
  return result.envelopeId
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const parsed = parseBody(SendToDocusignBodySchema, await req.json())
    if (!parsed.ok) return parsed.response

    const {
      formData,
      selectedDocs = { lease: true, insurance: true, ach: true },
      vooStockNumber  = null,
      supplementalData = null,
    } = parsed.data

    // 1. Build the record shape from form data
    const recordData = {
      ...buildRecord(formData),
      voo_stock_number: vooStockNumber,
      supplemental_data: supplementalData,
    }

    // 2. Save to Supabase first so we have an ID even if DocuSign fails
    const { data: saved, error: insertError } = await getSupabaseAdmin()
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

    // 4. Generate only selected PDF documents in parallel
    const [leasePdfBytes, insurancePdfBytes, achPdfBytes] = await Promise.all([
      generatePdf(pdfRecord),
      selectedDocs.insurance ? generateInsurancePdf(pdfRecord) : Promise.resolve(null),
      selectedDocs.ach       ? generateAchPdf(pdfRecord)       : Promise.resolve(null),
    ])

    // 5. Create DocuSign envelope with selected documents
    const envelopeId = await createEnvelope(leasePdfBytes, insurancePdfBytes, achPdfBytes, formData, savedRecord)

    // 6. Persist envelope ID and mark as sent
    await getSupabaseAdmin()
      .from('leases')
      .update({ doc_status: 'sent', docusign_envelope_id: envelopeId })
      .eq('id', savedRecord.id)

    const userEmail = await getUserEmailFromRequest(req)
    const primary   = formData.lesseeSignatories?.[0]
    const coLessee  = formData.lesseeSignatories?.[1]
    await logAudit(userEmail, 'lease.sent_to_docusign', savedRecord.id, {
      envelope_id: envelopeId,
      signers: [
        primary?.email   || savedRecord.lessee_email,
        coLessee?.email,
        formData.lessorSignatoryEmail,
      ].filter(Boolean),
    })

    return NextResponse.json({ envelopeId, leaseId: savedRecord.id }, { status: 201 })
  } catch (err) {
    console.error('[send-to-docusign]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
