import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })

    const today = new Date().toISOString().split('T')[0]

    const { error } = await getSupabaseAdmin()
      .from('pritchard_lease_portfolio')
      .update({ lease_status: 'Purchased', sold_date: today, archived: true })
      .in('id', ids)
      .in('lease_status', ['Out of Service', 'Expired'])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: ids.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
