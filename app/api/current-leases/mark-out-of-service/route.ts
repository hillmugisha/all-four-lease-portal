import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'
import { getUserEmailFromRequest } from '@/lib/auth-user'
import { parseBody, StringIdsSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const parsed = parseBody(StringIdsSchema, await req.json())
    if (!parsed.ok) return parsed.response
    const { ids } = parsed.data

    const supabase = getSupabaseAdmin()
    const today = new Date().toISOString().split('T')[0]

    const { data: records } = await supabase
      .from('pritchard_lease_portfolio')
      .select('id, customer_name, model_year, make, model, vin, email_address')
      .in('id', ids)
      .eq('lease_status', 'Active')

    const { error } = await supabase
      .from('pritchard_lease_portfolio')
      .update({ lease_status: 'Out of Service', out_of_service_date: today })
      .in('id', ids)
      .eq('lease_status', 'Active')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userEmail = await getUserEmailFromRequest(req)
    await logAudit(userEmail, 'lease.marked_out_of_service', undefined, {
      count:  (records ?? []).length,
      leases: (records ?? []).map((r) => ({
        id:                  r.id,
        customer_name:       r.customer_name,
        vehicle:             `${r.model_year ?? ''} ${r.make ?? ''} ${r.model ?? ''}`.trim(),
        vin:                 r.vin,
        email:               r.email_address,
        out_of_service_date: today,
      })),
    })

    return NextResponse.json({ ok: true, count: (records ?? []).length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
