import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const BATCH = 1000

export async function GET() {
  try {
    const all = []
    let from = 0

    while (true) {
      const { data, error } = await getSupabaseAdmin()
        .from('pritchard_lease_portfolio')
        .select('*')
        .eq('lease_status', 'Expired')
        .order('out_of_service_date', { ascending: false })
        .range(from, from + BATCH - 1)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      all.push(...data)
      if (data.length < BATCH) break
      from += BATCH
    }

    return NextResponse.json(all)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
