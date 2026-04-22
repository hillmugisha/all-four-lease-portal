/**
 * GET /api/vehicles/lookup?vin=<vin>
 *
 * Searches both the `leases` table and `current_lease_info` table for a
 * matching VIN and returns normalised vehicle details.
 *
 * Response (found):
 *   { found: true, condition, year, make, model, bodyStyle, odometer }
 *
 * Response (not found):
 *   { found: false }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get('vin')?.trim().toUpperCase()
  if (!vin || vin.length !== 17) {
    return NextResponse.json({ found: false })
  }

  const supabase = getSupabaseAdmin()

  // 1. Search leases table first (most complete data)
  const { data: lease } = await supabase
    .from('leases')
    .select('vehicle_condition, vehicle_year, vehicle_make, vehicle_model, vehicle_body_style, vehicle_odometer')
    .ilike('vehicle_vin', vin)
    .limit(1)
    .maybeSingle()

  if (lease) {
    return NextResponse.json({
      found:     true,
      condition: lease.vehicle_condition ?? 'NEW',
      year:      lease.vehicle_year      ?? '',
      make:      lease.vehicle_make      ?? '',
      model:     lease.vehicle_model     ?? '',
      bodyStyle: lease.vehicle_body_style ?? '',
      odometer:  lease.vehicle_odometer  ?? '',
    })
  }

  // 2. Fall back to current_lease_info
  const { data: cli } = await supabase
    .from('current_lease_info')
    .select('year, make, model, odometer')
    .ilike('vin', vin)
    .limit(1)
    .maybeSingle()

  if (cli) {
    return NextResponse.json({
      found:     true,
      condition: 'USED',
      year:      cli.year?.toString() ?? '',
      make:      cli.make             ?? '',
      model:     cli.model            ?? '',
      bodyStyle: '',
      odometer:  cli.odometer?.toString() ?? '',
    })
  }

  return NextResponse.json({ found: false })
}
