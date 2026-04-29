import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'
import { getUserEmailFromRequest } from '@/lib/auth-user'
import { parseBody, LeaseUpdateSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// PATCH /api/leases/:id — partial update (envelope ID, status, signed_at, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parsed = parseBody(LeaseUpdateSchema, await req.json())
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const { data: before } = await getSupabaseAdmin()
      .from('leases')
      .select('*')
      .eq('id', params.id)
      .single()

    const { data, error } = await getSupabaseAdmin()
      .from('leases')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (before) {
      const changes = Object.fromEntries(
        Object.entries(body)
          .filter(([k, v]) => (before as Record<string, unknown>)[k] !== v)
          .map(([k, v]) => [k, { before: (before as Record<string, unknown>)[k], after: v }]),
      )
      if (Object.keys(changes).length > 0) {
        const userEmail = await getUserEmailFromRequest(req)
        await logAudit(userEmail, 'lease.updated', params.id, { changes })
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}

// GET /api/leases/:id — fetch a single record
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('leases')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/leases/:id — delete a lease record
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { data: snapshot } = await getSupabaseAdmin()
      .from('leases')
      .select('*')
      .eq('id', params.id)
      .single()

    const { error } = await getSupabaseAdmin()
      .from('leases')
      .delete()
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userEmail = await getUserEmailFromRequest(req)
    await logAudit(userEmail, 'lease.deleted', params.id, { snapshot })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
