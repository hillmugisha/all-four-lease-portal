import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { LeaseScheduleFormData, LeaseScheduleRecord } from '@/lib/lease-schedule-types'

export const dynamic = 'force-dynamic'

// ─── GET /api/lease-schedules ─────────────────────────────────────────────────

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('lease_schedules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─── POST /api/lease-schedules ────────────────────────────────────────────────
// Creates a new lease schedule draft (doc_status = null).

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { formData: LeaseScheduleFormData }
    const raw = body.formData

    const primary  = raw.lesseeSignatories?.[0]
    const coLessee = raw.lesseeSignatories?.[1]

    const lesseeName = raw.lesseeType === 'individual'
      ? `${raw.lesseeFirstName ?? ''} ${raw.lesseeLastName ?? ''}`.trim()
      : raw.lesseeName ?? ''

    const record: Omit<LeaseScheduleRecord, 'id' | 'created_at'> = {
      lessor_name:    raw.lessorName    || null,
      lessor_address: raw.lessorAddress || null,
      lessor_po_box:  raw.lessorPoBox   || null,
      lessor_city:    raw.lessorCity    || null,
      lessor_state:   (raw.lessorState ?? '').toUpperCase() || null,
      lessor_zip:     raw.lessorZip     || null,

      lessee_name:       lesseeName || null,
      lessee_type:       raw.lesseeType || null,
      lessee_first_name: raw.lesseeFirstName || null,
      lessee_last_name:  raw.lesseeLastName  || null,
      lessee_location:   raw.location        || null,
      lessee_address:    raw.address         || null,
      lessee_city:       raw.city            || null,
      lessee_state:      (raw.state ?? '').toUpperCase() || null,
      lessee_zip:        raw.zip             || null,
      lessee_phone:      raw.phone           || null,
      lessee_email:      raw.email           || null,

      lease_type:         raw.leaseType         || null,
      contract_structure: raw.contractStructure  || null,
      customer_type:      raw.customerType       || null,
      vehicle_use:        raw.vehicleUse         || null,
      department:         raw.department         || null,
      department_other:   raw.departmentOther    || null,

      vehicles_json: raw.vehicles ? JSON.stringify(raw.vehicles) : null,

      lessor_signer_name:   raw.lessorSignatoryName  || null,
      lessor_signer_email:  raw.lessorSignatoryEmail || null,
      lessor_signer_title:  raw.lessorSignatoryTitle || null,
      customer_signer_name: primary
        ? `${primary.firstName} ${primary.lastName}`.trim()
        : null,
      customer_signer_email: primary?.email || null,
      co_lessee_signer_name: coLessee?.firstName
        ? `${coLessee.firstName} ${coLessee.lastName}`.trim()
        : null,

      master_lease_ref: raw.masterLeaseRef || null,
      schedule_date:    raw.scheduleDate   || null,

      docusign_envelope_id: null,
      doc_status:           null,
      is_active:            false,
      signed_at:            null,
    }

    const { data, error } = await getSupabaseAdmin()
      .from('lease_schedules')
      .insert(record)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[lease-schedules POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
