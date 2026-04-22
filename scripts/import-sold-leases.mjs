/**
 * import-sold-leases.mjs
 * Reads Sold Leases.xlsx and bulk-inserts into Supabase pritchard_lease_portfolio table.
 *
 * Usage:
 *   node scripts/import-sold-leases.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import xlsx from 'xlsx'
import { createClient } from '@supabase/supabase-js'

// ── Load env ──────────────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

const envPath = join(root, '.env.local')
const envVars = {}
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) envVars[m[1].trim()] = m[2].trim()
  }
} catch {
  console.error('Could not read .env.local')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  || envVars['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || envVars['SUPABASE_SECRET_KEY']
                  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envVars['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null
  try {
    const d = xlsx.SSF.parse_date_code(serial)
    if (!d || d.y < 1900 || d.y > 2100) return null
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  } catch {
    return null
  }
}

function toNum(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const cleaned = String(v).trim().replace(/^\$/, '').replace(/,/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return isNaN(n) ? null : n
}

function toText(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s || null
}

// ── Column mappings (47 columns, 0-based) ─────────────────────────────────────

// Date column indices
const DATE_COLS = new Set([0, 18, 20, 21, 23, 37, 38, 44])
//  0:  sold_date
//  18: ndvr_date
//  20: odometer_date
//  21: lease_start_date
//  23: lease_end_date
//  37: loan_lease_start_date
//  38: loan_lease_end_date
//  44: disposal_date

// Numeric column indices
const NUM_COLS = new Set([19, 24, 25, 26, 27, 28, 29, 33, 39, 40, 41, 42, 43, 46])
//  19: odometer_at_time_of_sale
//  24: net_cap_cost           25: monthly_depreciation    26: monthly_payment
//  27: lease_end_residual
//  28: annual_miles_limit     29: lease_end_mile_fee
//  31: registration_date — stored as text
//  33: tax_paid_upfront
//  39: monthly_liability_payment
//  40: funding_amount         41: balloon_payment
//  42: monthly_depreciation_sl
//  43: lender_interest_rate
//  45: wholesale_proceeds — dropped
//  46: net_sale_price

const COL_MAP = [
  'sold_date',                  // 0   Sold Date                 (date)
  'company_name',               // 1   Company
  'customer_type',              // 2   Customer Type
  'customer_name',              // 3   Customer
  'driver',                     // 4   Location / Driver
  null,                         // 5   Payment Method (removed)
  'billing_address',            // 6   Billing Address
  'billing_city',               // 7   Billing City
  'billing_state',              // 8   Billing State
  'billing_zip_code',           // 9   Billing Zip Code
  'phone',                      // 10  Phone #
  'email_address',              // 11  Email Address
  'model_year',                 // 12  Year
  'make',                       // 13  Make
  'model',                      // 14  Model
  'color',                      // 15  Color
  'vin',                        // 16  VIN
  'comments',                   // 17  Comments
  'ndvr_date',                  // 18  NVDR Date                 (date)
  'odometer_at_time_of_sale',   // 19  Sold Odometer             (num)
  'odometer_date',              // 20  Odom Date                 (date)
  'lease_start_date',           // 21  Lease Start Date          (date)
  'term',                       // 22  Term
  'lease_end_date',             // 23  Lease End Date            (date)
  'net_cap_cost',               // 24  Net Cap Cost              (num)
  'monthly_depreciation',       // 25  Mon Dep                   (num)
  'monthly_payment',            // 26  Mon Payment               (num)
  'lease_end_residual',         // 27  Residual / Resale Quote   (num)
  'annual_miles_limit',         // 28  Annual Miles              (num)
  'lease_end_mile_fee',         // 29  Lease End Mile Fee        (num)
  'title_state',                // 30  TTL State
  'registration_date',          // 31  TTL Mo                    (text)
  'plate_number',               // 32  Plate #
  'tax_paid_upfront',           // 33  Upfront Tax Paid          (num)
  null,                         // 34  VIN8 (removed)
  'lender',                     // 35  Lender / Lessor
  'lender_loan_lease_number',   // 36  Loan Lease #
  'liability_start_date',       // 37  Loan / Lease Start Date   (date)
  'liability_end_date',         // 38  Loan / Lease End Date     (date)
  'monthly_liability_payment',  // 39  Monthly Payment (lender)  (num)
  'funding_amount',             // 40  Net Cap Cost (lender)     (num)
  'balloon_payment',            // 41  Balloon / Residual        (num)
  'monthly_depreciation_sl',    // 42  Monthly Depreciation      (num)
  'lender_interest_rate',       // 43  Lender Int. Rate          (num)
  'disposal_date',              // 44  Disposal Date             (date)
  null,                         // 45  Wholesale Proceeds        (dropped)
  'net_sale_price',             // 46  MMR or Net Sale Price     (num)
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading Sold Leases.xlsx…')
  const wb   = xlsx.readFile(join(root, 'Sold Leases.xlsx'))
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: true })

  const dataRows = rows.slice(1)
  console.log(`Found ${dataRows.length} data rows`)

  const records = []
  for (const row of dataRows) {
    if (!row || row.every(v => v === null || v === undefined || v === '')) continue

    const record = { lease_status: 'Purchased' }

    COL_MAP.forEach((field, idx) => {
      if (!field) return
      const raw = row[idx]
      if (DATE_COLS.has(idx)) {
        if (typeof raw === 'number' && raw > 10000) {
          record[field] = excelDateToISO(raw)
        } else if (raw) {
          record[field] = toText(raw)
        } else {
          record[field] = null
        }
      } else if (NUM_COLS.has(idx)) {
        record[field] = toNum(raw)
      } else {
        record[field] = toText(raw)
      }
    })

    records.push(record)
  }

  console.log(`Prepared ${records.length} records for insert`)

  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH)
    const { error } = await supabase.from('pritchard_lease_portfolio').insert(chunk)
    if (error) {
      console.error(`Error inserting batch ${i}–${i + chunk.length}:`, error.message)
      console.error('First row of failed batch:', JSON.stringify(chunk[0], null, 2))
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`\rInserted ${inserted} / ${records.length}`)
  }

  console.log(`\n✓ Done — ${inserted} records inserted into pritchard_lease_portfolio`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
