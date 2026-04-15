/**
 * import-expired-leases.mjs
 * Reads Expired Leases.xlsx and bulk-inserts into Supabase expired_leases table.
 *
 * Usage:
 *   node scripts/import-expired-leases.mjs
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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars['SUPABASE_SERVICE_ROLE_KEY']
                  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']

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

// ── Column mappings (43 columns, 0-based) ─────────────────────────────────────

// Date column indices
const DATE_COLS = new Set([0, 17, 19, 20, 22, 36, 37])
//  0:  expired_date
//  17: ndvr_date
//  19: odometer_date
//  20: lease_start_date
//  22: lease_end_date
//  36: loan_lease_start_date
//  37: loan_lease_end_date

// Numeric column indices (26 = monthly_tax is text — kept as-is)
const NUM_COLS = new Set([18, 23, 24, 25, 27, 28, 29, 30, 32, 38, 39, 40, 41, 42])
//  18: odometer
//  23: net_cap_cost        24: mon_dep          25: mon_interest
//  27: mon_payment         28: residual_resale_quote
//  29: annual_miles        30: lease_end_mile_fee
//  32: ttl_mo
//  38: monthly_payment (lender)
//  39: lender_net_cap_cost 40: balloon_residual
//  41: monthly_depreciation_lender
//  42: lender_int_rate_pct

const COL_MAP = [
  'expired_date',               // 0   Expired Date              (date)
  'company',                    // 1   Company
  'customer_type',              // 2   Customer Type
  'customer_name',              // 3   Customer or Business Name
  'location_driver',            // 4   Location / Driver
  'payment_method',             // 5   Payment Method
  'billing_address',            // 6   Billing Address
  'billing_city',               // 7   Billing City
  'billing_state',              // 8   Billing State
  'billing_zip_code',           // 9   Billing Zip Code
  'phone',                      // 10  Phone #
  'email_address',              // 11  Email Address
  'year',                       // 12  Year
  'make',                       // 13  Make
  'model',                      // 14  Model
  'color',                      // 15  Color
  'vin',                        // 16  VIN
  'ndvr_date',                  // 17  NVDR Date                 (date)
  'odometer',                   // 18  Odometer                  (num)
  'odometer_date',              // 19  Odom Date                 (date)
  'lease_start_date',           // 20  Lease Start Date          (date)
  'term',                       // 21  Term
  'lease_end_date',             // 22  Lease End Date            (date)
  'net_cap_cost',               // 23  Net Cap Cost              (num)
  'mon_dep',                    // 24  Mon Dep                   (num)
  'mon_interest',               // 25  Mon Interest              (num)
  'monthly_tax',                // 26  Monthly Tax               (text)
  'mon_payment',                // 27  Mon Payment               (num)
  'residual_resale_quote',      // 28  Residual / Resale Quote   (num)
  'annual_miles',               // 29  Annual Miles              (num)
  'lease_end_mile_fee',         // 30  Lease End Mile Fee        (num)
  'ttl_state',                  // 31  TTL State
  'ttl_mo',                     // 32  TTL Mo                    (num)
  'plate_number',               // 33  Plate #
  'lender_lessor',              // 34  Lender / Lessor
  'loan_lease_number',          // 35  Loan / Lease #
  'loan_lease_start_date',      // 36  Loan / Lease Start Date   (date)
  'loan_lease_end_date',        // 37  Loan / Lease End Date     (date)
  'monthly_payment',            // 38  Monthly Payment (lender)  (num)
  'lender_net_cap_cost',        // 39  Net Cap Cost (lender)     (num)
  'balloon_residual',           // 40  Balloon / Residual        (num)
  'monthly_depreciation_lender',// 41  Monthly Depreciation      (num)
  'lender_int_rate_pct',        // 42  Lender Int. Rate %        (num)
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading Expired Leases.xlsx…')
  const wb   = xlsx.readFile(join(root, 'Expired Leases.xlsx'))
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: true })

  const dataRows = rows.slice(1)
  console.log(`Found ${dataRows.length} data rows`)

  const records = []
  for (const row of dataRows) {
    if (!row || row.every(v => v === null || v === undefined || v === '')) continue

    const record = {}

    COL_MAP.forEach((field, idx) => {
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
    const { error } = await supabase.from('expired_leases').insert(chunk)
    if (error) {
      console.error(`Error inserting batch ${i}–${i + chunk.length}:`, error.message)
      console.error('First row of failed batch:', JSON.stringify(chunk[0], null, 2))
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`\rInserted ${inserted} / ${records.length}`)
  }

  console.log(`\n✓ Done — ${inserted} records inserted into expired_leases`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
