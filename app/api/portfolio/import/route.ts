import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseBody } from '@/lib/validation'
import { z } from 'zod'

const ImportBodySchema = z.object({
  rows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))).min(1).max(5000),
})

// ─── Column header → DB field map ─────────────────────────────────────────────
// These are the only fields a user can update via import.
// Protected fields (id, lease_id, lease_status, archived, etc.) are not listed
// here and are stripped before any update.

const COLUMN_MAP: Record<string, string> = {
  // Customer
  'Company':               'company_name',
  'Customer Name':         'customer_name',
  'Customer Type':         'customer_type',
  'Driver':                'driver',
  'Location':              'location',
  'Phone':                 'phone',
  'Email':                 'email_address',
  'Billing Address':       'billing_address',
  'Billing City':          'billing_city',
  'Billing State':         'billing_state',
  'Billing ZIP':           'billing_zip_code',
  // Vehicle
  'Year':                       'model_year',
  'Make':                       'make',
  'Model':                      'model',
  'Color':                      'color',
  'VIN':                        'vin',
  'Comments':                   'comments',
  'GPS Serial #':               'gps_serial_number',
  'Vehicle Acquisition Date':   'vehicle_acquisition_date',
  'Vehicle Use Type':           'vehicle_use_type',
  // Odometer
  'Odometer':        'odometer',
  'Odometer Date':   'odometer_date',
  'Sold Odometer':   'odometer_at_time_of_sale',
  // Dates
  'Lease Start':              'lease_start_date',
  'Lease End':                'lease_end_date',
  'Term (mo.)':               'term',
  'NDVR Date':                'ndvr_date',
  'Out of Service Date':      'out_of_service_date',
  'Insurance Exp. Date':      'insurance_expiration_date',
  'First Liability Pmt Date': 'first_liability_payment_date',
  'Registration Date':        'registration_date',
  // Financials
  'Net Cap Cost':          'net_cap_cost',
  'Mon. Depreciation':     'monthly_depreciation',
  'Mon. Interest':         'monthly_interest',
  'Mon. Tax':              'monthly_tax',
  'Mon. Payment':          'monthly_payment',
  'Lease End Residual':    'lease_end_residual',
  'Tax Paid Upfront':      'tax_paid_upfront',
  'Acquisition Fee':       'acquisition_fee',
  'Incentive Recognition': 'incentive_recognition',
  'Mon. Cash Flow':        'monthly_cash_flow',
  // Lease Terms
  'Annual Miles':       'annual_miles_limit',
  'Lease End Mile Fee': 'lease_end_mile_fee',
  'Title State':        'title_state',
  'Plate #':            'plate_number',
  'Tax Type':           'tax_type',
  // Lender
  'Lender':                 'lender',
  'Loan/Lease #':           'lender_loan_lease_number',
  'Liability Start':        'liability_start_date',
  'Liability End':          'liability_end_date',
  'Funding Amount':         'funding_amount',
  'Monthly Liability Pmt.': 'monthly_liability_payment',
  'Balloon Payment':        'balloon_payment',
  'Mon. Dep. (SL)':         'monthly_depreciation_sl',
  'Lender Int. Rate':       'lender_interest_rate',
  'Lender Term':            'lender_term',
  'Lender Type':            'lender_type',
  'Liability Balance':      'liability_balance',
  'Net Book Value':         'net_book_value',
  // Classification
  'Contract Structure': 'contract_structure',
  'Lease Type':         'lease_type',
  'Onboard Type':       'onboard_type',
  // Sale & Disposition
  'Sold Date':        'sold_date',
  'Disposal Date':    'disposal_date',
  'Net Sale Price':   'net_sale_price',
  'MMR':              'mmr',
  'Days to Sell':     'days_to_sell',
  'Disposition Fees': 'disposition_fees',
  'Early Term Fees':  'early_term_fees',
}

// Fields that must never be written via import, even if the user includes them
const PROTECTED = new Set([
  'id', 'lease_id', 'created_at', 'updated_at', 'lease_status',
  'archived', 'portal_lease_id', 'mla_id', 'mla_flag',
])

export async function POST(req: NextRequest) {
  try {
    const parsed = parseBody(ImportBodySchema, await req.json())
    if (!parsed.ok) return parsed.response
    const rows = parsed.data.rows

    // Validate every row has Lease ID
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]['Lease ID'] || String(rows[i]['Lease ID']).trim() === '')
        return NextResponse.json({ error: `Row ${i + 2} is missing a Lease ID.` }, { status: 400 })
    }

    const leaseIds = rows.map((r) => String(r['Lease ID']).trim())

    // Fetch matching non-archived records to validate they exist
    const { data: existing, error: fetchErr } = await getSupabaseAdmin()
      .from('pritchard_lease_portfolio')
      .select('id, lease_id')
      .in('lease_id', leaseIds)
      .not('archived', 'eq', true)

    if (fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const existingSet = new Set((existing ?? []).map((r) => r.lease_id))

    let updated = 0
    let skipped = 0
    const errors: { row: number; lease_id: string; message: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row     = rows[i]
      const leaseId = String(row['Lease ID']).trim()
      const rowNum  = i + 2 // 1-indexed + header row

      if (!existingSet.has(leaseId)) {
        skipped++
        errors.push({ row: rowNum, lease_id: leaseId, message: 'No active/non-archived record found for this Lease ID.' })
        continue
      }

      // Build update payload
      const payload: Record<string, unknown> = {}
      for (const [header, value] of Object.entries(row)) {
        if (header === 'Lease ID') continue
        const dbField = COLUMN_MAP[header]
        if (!dbField) continue
        if (PROTECTED.has(dbField)) continue
        const str = String(value).trim()
        if (str === '') continue // don't overwrite with blank
        payload[dbField] = str
      }

      if (Object.keys(payload).length === 0) {
        skipped++
        continue
      }

      const { error: updateErr } = await getSupabaseAdmin()
        .from('pritchard_lease_portfolio')
        .update(payload)
        .eq('lease_id', leaseId)
        .not('archived', 'eq', true)

      if (updateErr) {
        errors.push({ row: rowNum, lease_id: leaseId, message: updateErr.message })
      } else {
        updated++
      }
    }

    return NextResponse.json({ updated, skipped, errors })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
