import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type Disposition = 'sold' | 'out_of_service'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { ids, disposition } = body as { ids: unknown; disposition: unknown }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }
    if (disposition !== 'sold' && disposition !== 'out_of_service') {
      return NextResponse.json({ error: 'disposition must be "sold" or "out_of_service"' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin()
      .from('Vehicles_On_Order')
      .update({ disposition: disposition as Disposition })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ updated: ids.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
