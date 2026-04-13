/**
 * POST /api/leases/activate
 *
 * Promotes one or more completed LeaseRecords into the current_lease_info
 * table so they appear in the Current Leases dashboard.
 *
 * Rules:
 *   – All supplied IDs must have doc_status = 'completed' (422 otherwise).
 *   – Idempotent: leases already marked is_active = true are silently skipped.
 *   – Each inserted current_lease_info row is mapped from the portal lease.
 *
 * Required DB columns (run once if missing):
 *   ALTER TABLE leases ADD COLUMN IF NOT EXISTS is_active    boolean      DEFAULT false;
 *   ALTER TABLE leases ADD COLUMN IF NOT EXISTS activated_at timestamptz;
 */
import { NextRequest, NextResponse } from 'next/server'
import docusign from 'docusign-esign'
import { getDocuSignClient, getAccountId } from '@/lib/docusign'
import { getSupabase } from '@/lib/supabase'
import type { LeaseRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'

// ─── Date helper ─────────────────────────────────────────────────────────────

/** Returns the date of the last payment (first_payment_date + numPayments-1 months). */
function calcLeaseEnd(firstPayment: string, numPayments: number): string {
  const [y, m, d] = firstPayment.split('-').map(Number)
  const end = new Date(y, m - 1 + (numPayments - 1), d)
  return end.toISOString().slice(0, 10)
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toCurrentLeaseRow(l: LeaseRecord) {
  const monthlyInterest =
    l.rent_charge && l.num_payments
      ? Math.round((l.rent_charge / l.num_payments) * 100) / 100
      : null

  return {
    // Customer
    customer_name:    l.lessee_name,
    email_address:    l.lessee_email,
    phone:            l.lessee_phone  ?? null,
    billing_address:  l.lessee_address,
    billing_city:     l.lessee_city,
    billing_state:    l.lessee_state,
    billing_zip_code: l.lessee_zip,
    customer_type:    null as string | null,

    // Vehicle
    year:              l.vehicle_year,
    make:              l.vehicle_make,
    model:             l.vehicle_model,
    vin:               l.vehicle_vin,
    color:             null as string | null,
    odometer:          l.vehicle_odometer ? Number(l.vehicle_odometer) : null,

    // Lease terms
    new_swap_addition: 'New',
    lease_start_date:  l.first_payment_date,
    lease_end_date:    l.first_payment_date && l.num_payments
      ? calcLeaseEnd(l.first_payment_date, l.num_payments)
      : null,
    term:              l.num_payments,
    annual_miles:      l.miles_per_year       ?? null,
    lease_end_mile_fee: l.excess_mileage_rate ?? null,

    // Financials (customer-facing)
    net_cap_cost:          l.adjusted_cap_cost        ?? null,
    mon_dep:               l.base_monthly_payment     ?? null,
    mon_interest:          monthlyInterest,
    monthly_tax:           l.monthly_sales_tax > 0
      ? String(l.monthly_sales_tax)
      : null,
    mon_payment:           l.total_monthly_payment    ?? null,
    residual_resale_quote: l.residual_value           ?? null,
    upfront_tax_paid:      l.amount_due_at_signing    ?? null,

    // Status
    lease_status: 'Active',
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No lease IDs provided' }, { status: 400 })
    }

    const supabase = getSupabase()

    // 1. Fetch the requested leases
    const { data: leases, error: fetchErr } = await supabase
      .from('leases')
      .select('*')
      .in('id', ids)

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!leases || leases.length === 0) {
      return NextResponse.json({ error: 'Leases not found' }, { status: 404 })
    }

    // 2a. Inline DocuSign sync: for any lease whose envelope shows completed in DocuSign
    //     but whose DB record is still stale, update now so validation doesn't reject it.
    const needsSync = (leases as LeaseRecord[]).filter(
      (l) => l.docusign_envelope_id && l.doc_status !== 'completed',
    )
    if (needsSync.length > 0) {
      try {
        const apiClient = await getDocuSignClient()
        const accountId = getAccountId()
        const envelopesApi = new docusign.EnvelopesApi(apiClient)
        await Promise.all(
          needsSync.map(async (l) => {
            try {
              const envelope = await envelopesApi.getEnvelope(
                accountId,
                l.docusign_envelope_id!,
              )
              if (envelope.status === 'completed') {
                await supabase
                  .from('leases')
                  .update({ doc_status: 'completed' })
                  .eq('id', l.id)
                // Mutate in-memory so validation below sees the updated status
                ;(l as LeaseRecord).doc_status = 'completed'
              }
            } catch {
              // Ignore per-envelope errors — validation will catch remaining issues
            }
          }),
        )
      } catch {
        // DocuSign unavailable — proceed; validation will reject any still-stale leases
      }
    }

    // 2b. Validate: every lease must be completed
    const invalid = (leases as LeaseRecord[]).filter((l) => l.doc_status !== 'completed')
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error:       'Only completed leases can be activated',
          invalid_ids: invalid.map((l) => l.id),
        },
        { status: 422 },
      )
    }

    // 3. Idempotency: skip already-active leases
    const toActivate = (leases as LeaseRecord[]).filter((l) => !l.is_active)

    if (toActivate.length === 0) {
      return NextResponse.json({ activated: 0, skipped: leases.length })
    }

    const now = new Date().toISOString()

    // 4. Insert rows into current_lease_info
    const rows = toActivate.map(toCurrentLeaseRow)

    const { error: insertErr } = await supabase
      .from('current_lease_info')
      .insert(rows)

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // 5. Mark leases as active
    const { error: updateErr } = await supabase
      .from('leases')
      .update({ is_active: true, activated_at: now })
      .in('id', toActivate.map((l) => l.id))

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({
      activated: toActivate.length,
      skipped:   leases.length - toActivate.length,
    })
  } catch (err) {
    console.error('[activate]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
