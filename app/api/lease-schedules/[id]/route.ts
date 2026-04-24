import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// ─── GET /api/lease-schedules/[id] ───────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await getSupabaseAdmin()
    .from('lease_schedules')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// ─── PUT /api/lease-schedules/[id] ───────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await req.json()

    const { data, error } = await getSupabaseAdmin()
      .from('lease_schedules')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
