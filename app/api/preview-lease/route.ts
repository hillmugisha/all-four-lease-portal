/**
 * GET /api/preview-lease?id=<uuid>
 *
 * Returns the rendered lease HTML directly in the browser so you can
 * inspect the layout before wiring up PDF generation.
 *
 * With ?id=  → loads that record from Supabase
 * Without id → renders the built-in example schema (great for first test)
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderLease } from '@/lib/lease-renderer'
import { recordToTemplateData } from '@/lib/lease-adapter'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { LeaseRecord } from '@/lib/types'
import schemaExample from '@/lib/lease-schema.json'
import type { LeaseTemplateData } from '@/lib/lease-types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    let data: LeaseTemplateData

    if (id) {
      // Load a real record from Supabase
      const { data: record, error } = await getSupabaseAdmin()
        .from('leases')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !record) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 })
      }
      data = recordToTemplateData(record as LeaseRecord)
    } else {
      // Use the built-in example schema — no DB needed
      data = schemaExample as unknown as LeaseTemplateData
    }

    const html = renderLease(data)

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('Preview error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
