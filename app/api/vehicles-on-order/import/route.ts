import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { VOO_APP_FIELDS } from '@/lib/voo-app-fields'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { rows: Record<string, unknown>[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const rows = body?.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No data rows provided.' }, { status: 400 })
  }
  if (rows.length > 5000) {
    return NextResponse.json({ error: 'Too many rows. Maximum is 5,000 per import.' }, { status: 400 })
  }

  // Validate every row has a non-empty Stock #
  for (let i = 0; i < rows.length; i++) {
    const stock = rows[i]['Stock #']
    if (!stock || String(stock).trim() === '') {
      return NextResponse.json({ error: `Row ${i + 2} is missing a Stock #.` }, { status: 400 })
    }
  }

  const stockNumbers = rows.map((r) => String(r['Stock #']).trim())

  const supabase = getSupabaseAdmin()

  // Fetch all records matching these stock numbers (may include duplicates from re-syncs)
  const { data: existing, error: fetchErr } = await supabase
    .from('Vehicles_On_Order')
    .select('id, stock_number, app_data')
    .in('stock_number', stockNumbers)
    .order('id', { ascending: false })

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  // Group by stock_number. For each group, keep the highest id (most recent sync)
  // and delete the duplicates so the table stays clean.
  const keepByStock = new Map<string, { id: number; app_data: Record<string, unknown> }>()
  const duplicateIds: number[] = []

  for (const r of (existing ?? [])) {
    const stock = String(r.stock_number).trim()
    if (!keepByStock.has(stock)) {
      // First (highest id) — keep this one
      keepByStock.set(stock, { id: r.id as number, app_data: (r.app_data ?? {}) as Record<string, unknown> })
    } else {
      // Lower id — mark for deletion
      duplicateIds.push(r.id as number)
    }
  }

  // Delete duplicates in one query
  if (duplicateIds.length > 0) {
    await supabase.from('Vehicles_On_Order').delete().in('id', duplicateIds)
  }

  let skipped = 0
  const errors: { row: number; id: string; message: string }[] = []
  const upserts:    { id: number; app_data: Record<string, unknown> }[] = []
  const fieldCounts: number[] = []  // parallel to upserts — patch size per row

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i]
    const stock  = String(row['Stock #']).trim()
    const rowNum = i + 2

    const record = keepByStock.get(stock)
    if (!record) {
      errors.push({ row: rowNum, id: stock, message: 'No vehicle found with this Stock #.' })
      skipped++
      continue
    }

    const patch: Record<string, unknown> = {}

    for (const field of VOO_APP_FIELDS) {
      const raw = row[field.label]
      if (raw === undefined || raw === null || String(raw).trim() === '') continue

      if (field.type === 'currency' || field.type === 'integer') {
        const n = Number(String(raw).replace(/[$,]/g, ''))
        if (isNaN(n) || n < 0) {
          errors.push({ row: rowNum, id: stock, message: `Invalid number for "${field.label}": "${raw}"` })
          continue
        }
        if (field.type === 'integer' && !Number.isInteger(n)) {
          errors.push({ row: rowNum, id: stock, message: `"${field.label}" must be a whole number` })
          continue
        }
        if (field.key === 'term' && (n < 1 || n > 84)) {
          errors.push({ row: rowNum, id: stock, message: 'Term must be between 1 and 84 months' })
          continue
        }
        patch[field.key] = n
      } else if (field.type === 'date') {
        const str = String(raw).trim()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          errors.push({ row: rowNum, id: stock, message: `"${field.label}" must be in YYYY-MM-DD format` })
          continue
        }
        patch[field.key] = str
      } else {
        patch[field.key] = String(raw).trim()
      }
    }

    if (Object.keys(patch).length === 0) {
      skipped++
      continue
    }

    upserts.push({ id: record.id, app_data: { ...record.app_data, ...patch } })
    fieldCounts.push(Object.keys(patch).length)
  }

  // Batch all updates in one DB round-trip instead of N separate calls
  let updated = 0
  if (upserts.length > 0) {
    const { error: upsertErr } = await supabase
      .from('Vehicles_On_Order')
      .upsert(upserts, { onConflict: 'id' })
    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }
    updated = upserts.length
  }

  return NextResponse.json({ updated, skipped, errors, fieldCounts })
}
