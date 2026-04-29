import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseBody, VooDisposeSchema } from '@/lib/validation'

export async function POST(req: Request) {
  try {
    const parsed = parseBody(VooDisposeSchema, await req.json())
    if (!parsed.ok) return parsed.response
    const { ids, disposition } = parsed.data

    const { error } = await getSupabaseAdmin()
      .from('Vehicles_On_Order')
      .update({ disposition })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ updated: ids.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
