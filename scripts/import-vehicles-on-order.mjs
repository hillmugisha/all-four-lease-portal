/**
 * import-vehicles-on-order.mjs
 * Reads "Current Reserved Vehicles (Stock & Sold).xlsx" and bulk-inserts
 * all records into the Supabase Vehicles_On_Order table.
 *
 * Usage:
 *   node scripts/import-vehicles-on-order.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import xlsx from 'xlsx'
import { createClient } from '@supabase/supabase-js'

// ── Load env ──────────────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

const envVars = {}
try {
  const lines = readFileSync(join(root, '.env.local'), 'utf-8').split('\n')
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
  console.error('Missing Supabase credentials. Check .env.local.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Read Excel ────────────────────────────────────────────────────────────────

const FILE = join(root, 'Current Reserved Vehicles (Stock & Sold).xlsx')
const wb   = xlsx.readFile(FILE)
const ws   = wb.Sheets[wb.SheetNames[0]]
const rows = xlsx.utils.sheet_to_json(ws, { defval: null })

console.log(`Read ${rows.length} rows from Excel`)

// ── Map columns ───────────────────────────────────────────────────────────────

function clean(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' || s === '-' ? null : s
}

const records = rows.map((r) => ({
  stock_number:                    clean(r['Stock #']),
  customer_name:                   clean(r['Customer Name']),
  sales_person:                    clean(r['Sales Person']),
  oem:                             clean(r['OEM']),
  oem_order_number:                clean(r['OEM Order #']),
  model_year:                      clean(r['Model Year']),
  body_code:                       clean(r['Body Code']),
  vin:                             clean(r['VIN']),
  customer_po_number:              clean(r['Customer PO #']),
  customer_po_date:                clean(r['Customer PO Date']),
  tracking_type:                   clean(r['Tracking Type']),
  order_date:                      clean(r['Order Date']),
  vehicle_line:                    clean(r['vehicleLine']),
  color:                           clean(r['Color']),
  ship_to_location:                clean(r['Ship to Location']),
  target_production_week:          clean(r['Target Production Week']),
  oem_status:                      clean(r['oemStatus']),
  chassis_eta:                     clean(r['Chassis ETA']),
  shaed_status:                    clean(r['SHAED Status']),
  customer_invoice_number:         clean(r['Customer Invoice #']),
  invoice_amount:                  clean(r['Invoice Amount']),
  invoice_date:                    clean(r['Invoice Date']),
  invoice_due_date:                clean(r['Invoice Due Date']),
  payment_date:                    clean(r['Payment Date']),
  upfitter_name:                   clean(r['Upfitter Name']),
  date_received_at_upfitter:       clean(r['Date Received At Upfitter']),
  upfit_status:                    clean(r['upfitStatus']),
  estimated_upfit_completion_date: clean(r['Estimated Upfit Completion Date']),
  actual_upfit_completion_date:    clean(r['Actual Upfit Completion Date']),
  logistics_status:                clean(r['logisticsStatus']),
  expected_delivery_date:          clean(r['expectedDeliveryDate']),
  stage:                           clean(r['Stage']),
  inventory_type:                  clean(r['Inventory Type']),
}))

// ── Insert in batches ─────────────────────────────────────────────────────────

const BATCH = 50
let inserted = 0

for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH)
  const { error } = await supabase.from('Vehicles_On_Order').insert(batch)
  if (error) {
    console.error(`Batch ${i}–${i + BATCH - 1} failed:`, error.message)
    process.exit(1)
  }
  inserted += batch.length
  process.stdout.write(`\rInserted ${inserted}/${records.length}`)
}

console.log(`\nDone — ${inserted} records inserted into Vehicles_On_Order.`)
