/**
 * import-active-leases.mjs
 * Reads Active Leases.xlsx and bulk-inserts into Supabase pritchard_lease_portfolio table.
 *
 * Usage:
 *   node scripts/import-active-leases.mjs
 *
 * Requires: xlsx, @supabase/supabase-js, dotenv (all already in project deps or devDeps)
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import xlsx from 'xlsx'
import { createClient } from '@supabase/supabase-js'

// ── Load env ──────────────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

// Read .env.local manually (dotenv not guaranteed to be installed)
const envPath = join(root, '.env.local')
const envVars = {}
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) envVars[m[1].trim()] = m[2].trim()
  }
} catch {
  console.error('Could not read .env.local — set SUPABASE_URL and SUPABASE_SERVICE_KEY manually')
}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || envVars['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY  = process.env.SUPABASE_SECRET_KEY || envVars['SUPABASE_SECRET_KEY']
                   || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envVars['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Excel date serial → ISO string ───────────────────────────────────────────

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
  if (!cleaned || cleaned === '' || cleaned === ' ') return null
  const n = Number(cleaned)
  return isNaN(n) ? null : n
}

function toText(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s || null
}

// ── Column mappings (47 columns, 0-based) ────────────────────────────────────

// Date column indices — stored as ISO date string
const DATE_COLS = new Set([17, 19, 20, 22, 39, 40])
//  17: ndvr_delivery_date
//  19: odometer_date
//  20: lease_start_date
//  22: lease_end_date
//  39: loan_lease_start_date
//  40: loan_lease_end_date

// Numeric column indices — non-numeric values stored as null
const NUM_COLS = new Set([
  18,  // odometer
  23,  // net_cap_cost
  24,  // monthly_depreciation
  25,  // monthly_interest
  // 26: monthly_tax — kept as text (can be "Paid Upfront", "Exempt", etc.)
  27,  // monthly_payment
  28,  // lease_end_residual
  29,  // annual_miles_limit
  30,  // lease_end_mile_fee
  // 32: registration_date — stored as text
  36,  // tax_paid_upfront
  41,  // monthly_liability_payment
  42,  // funding_amount
  43,  // balloon_payment
  44,  // monthly_depreciation_sl
  45,  // lender_interest_rate
])

// Column index → DB field name
const COL_MAP = [
  'onboard_type',               // 0   New/Swap/Addition
  'company_name',               // 1   Company
  'customer_type',              // 2   Customer Type
  'customer_name',              // 3   Customer Name
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
  'ndvr_date',                  // 17  NDVR/Delivery Date        (date)
  'odometer',                   // 18  Odometer                  (num)
  'odometer_date',              // 19  Odometer Date             (date)
  'lease_start_date',           // 20  Lease Start Date          (date)
  'term',                       // 21  Term
  'lease_end_date',             // 22  Lease End Date            (date)
  'net_cap_cost',               // 23  Net Cap Cost              (num)
  'monthly_depreciation',       // 24  Mon Dep                   (num)
  'monthly_interest',           // 25  Mon Interest              (num)
  'monthly_tax',                // 26  Monthly Tax               (text)
  'monthly_payment',            // 27  Mon Payment               (num)
  'lease_end_residual',         // 28  Residual / Resale Quote   (num)
  'annual_miles_limit',         // 29  Annual Miles              (num)
  'lease_end_mile_fee',         // 30  Lease End Mile Fee        (num)
  'title_state',                // 31  TTL State
  'registration_date',          // 32  TTL Mo                    (text)
  'plate_number',               // 33  Plate #
  null,                         // 34  Lease Depreciation (months) (removed)
  'insurance_expiration_date',  // 35  Copy of Ins (DATE of Expiration) — special handling
  'tax_paid_upfront',           // 36  Upfront Tax Paid          (num)
  'lender',                     // 37  Lender / Lessor
  'lender_loan_lease_number',   // 38  Loan / Lease #
  'liability_start_date',       // 39  Loan / Lease Start Date   (date)
  'liability_end_date',         // 40  Loan / Lease End Date     (date)
  'monthly_liability_payment',  // 41  Monthly Payment           (num)
  'funding_amount',             // 42  Net Cap Cost (lender)     (num)
  'balloon_payment',            // 43  Balloon / Residual        (num)
  'monthly_depreciation_sl',    // 44  Monthly Depreciation      (num)
  'lender_interest_rate',       // 45  Lender Int. Rate %        (num)
  'lender_term',                // 46  Term (lender)
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading Active Leases.xlsx…')
  const wb   = xlsx.readFile(join(root, 'Active Leases.xlsx'))
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: true })

  // Skip header row
  const dataRows = rows.slice(1)
  console.log(`Found ${dataRows.length} data rows`)

  const records = []
  for (const row of dataRows) {
    // Skip completely empty rows
    if (!row || row.every(v => v === null || v === undefined || v === '')) continue

    const record = { lease_status: 'Active' }

    COL_MAP.forEach((field, idx) => {
      if (!field) return
      // insurance_expiration_date handled below
      if (idx === 35) return

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

    // insurance_expiration_date: may be a date serial or free text
    const insRaw = row[35]
    if (typeof insRaw === 'number' && insRaw > 10000) {
      record['insurance_expiration_date'] = excelDateToISO(insRaw)
    } else {
      record['insurance_expiration_date'] = toText(insRaw)
    }

    records.push(record)
  }

  console.log(`Prepared ${records.length} records for insert`)

  // Batch insert in chunks of 100
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
