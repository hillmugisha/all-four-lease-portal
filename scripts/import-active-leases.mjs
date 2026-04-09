/**
 * import-active-leases.mjs
 * Reads Active Leases.xlsx and bulk-inserts into Supabase current_lease_info table.
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
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars['SUPABASE_SERVICE_ROLE_KEY']
                   || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY)')
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
  // Strip whitespace, tabs, $, commas then try to parse
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

// Date column indices (0-based) — stored as text, but ISO-formatted when the cell is an Excel serial
const DATE_COLS = new Set([18, 20, 21, 23, 40, 41])

// Numeric column indices — non-numeric values (e.g. "N/A", "Paid Upfront") are stored as null
const NUM_COLS = new Set([
  19, 24, 25, 26, 28, 29, 30, 31, 33, 35, 37,  // 27 (monthly_tax) removed — can be "Paid Upfront", "Exempt", etc.
  42, 43, 44, 45, 46, 49, 50, 52, 53,
  56, 61, 62, 63, 64, 65, 68, 69, 70, 71, 72, 73,
])

// ── Column index → DB field name ─────────────────────────────────────────────

const COL_MAP = [
  'new_swap_addition',          // 0
  'company',                    // 1
  'customer_type',              // 2
  'customer_name',              // 3
  'location_driver',            // 4
  'payment_method',             // 5
  'billing_address',            // 6
  'billing_city',               // 7
  'billing_state',              // 8
  'billing_zip_code',           // 9
  'phone',                      // 10
  'email_address',              // 11
  'year',                       // 12
  'make',                       // 13
  'model',                      // 14
  'color',                      // 15
  'vin',                        // 16
  'comments',                   // 17
  'ndvr_delivery_date',         // 18 (date)
  'odometer',                   // 19 (num)
  'odometer_date',              // 20 (date)
  'lease_start_date',           // 21 (date)
  'term',                       // 22
  'lease_end_date',             // 23 (date)
  'net_cap_cost',               // 24 (num)
  'mon_dep',                    // 25 (num)
  'mon_interest',               // 26 (num)
  'monthly_tax',                // 27 (num)
  'mon_payment',                // 28 (num)
  'residual_resale_quote',      // 29 (num)
  'annual_miles',               // 30 (num)
  'lease_end_mile_fee',         // 31 (num)
  'ttl_state',                  // 32
  'ttl_mo',                     // 33 (num)
  'plate_number',               // 34
  'lease_depreciation_months',  // 35 (num)
  'insurance_expiration_date',  // 36 (text — can be date serial or text)
  'upfront_tax_paid',           // 37 (num)
  'lender_lessor',              // 38
  'loan_lease_number',          // 39
  'loan_lease_start_date',      // 40 (date)
  'loan_lease_end_date',        // 41 (date)
  'monthly_payment',            // 42 (num)
  'lender_net_cap_cost',        // 43 (num)
  'balloon_residual',           // 44 (num)
  'monthly_depreciation_lender',// 45 (num)
  'lender_int_rate_pct',        // 46 (num)
  'lender_term',                // 47
  'in_service_date',            // 48
  'internal_book_value',        // 49 (num)
  'lender_mo_dep_pct',          // 50 (num)
  'am',                         // 51
  'prorate_pd',                 // 52 (num)
  'prorate_rcvd',               // 53 (num)
  'col_x1',                     // 54
  'gps_serial_number',          // 55
  'monthly_cash_flow_delta',    // 56 (num)
  'account_manager',            // 57
  'col_x2',                     // 58
  'col_x3',                     // 59
  'location',                   // 60
  'mmr',                        // 61 (num)
  'balance_sheet_mar_2026',     // 62 (num)
  'bal_sheet_delta',            // 63 (num)
  'nbv_apr_2026',               // 64 (num)
  'nbv_delta',                  // 65 (num)
  'additional_comments',        // 66
  'disposal_comments_90_day',   // 67
  'days_to_sell',               // 68 (num)
  'invoice_to_retail',          // 69 (num)
  'payoff_quoted_paid',         // 70 (num)
  'payoff_proceeds_sent',       // 71 (num)
  'balance_sheet_apr_09_2026',  // 72 (num)
  'customer_lease_depreciated_book_value', // 73 (num)
  'vin_2',                      // 74
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
      const raw = row[idx]
      if (DATE_COLS.has(idx)) {
        // Try to parse as Excel date serial
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

    // insurance_expiration_date: may be a date serial or text
    const insRaw = row[36]
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
    const { error } = await supabase.from('current_lease_info').insert(chunk)
    if (error) {
      console.error(`Error inserting batch ${i}–${i + chunk.length}:`, error.message)
      console.error('First row of failed batch:', JSON.stringify(chunk[0], null, 2))
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`\rInserted ${inserted} / ${records.length}`)
  }

  console.log(`\n✓ Done — ${inserted} records inserted into current_lease_info`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
