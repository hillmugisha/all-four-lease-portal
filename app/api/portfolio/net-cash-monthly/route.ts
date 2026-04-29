import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface NetCashMonthlyPoint {
  month: string
  inflows_active: number
  inflows_oos: number
  inflows_demo: number
  outflows_financing: number
}

// Mock data (values in $K). Replace this block with a Supabase query when real
// data is available — group pritchard_lease_portfolio by month via
// lease_start_date, sum monthly_payment by vehicle_use_type/lease_status for
// inflows, and monthly_liability_payment for outflows.
const MOCK_DATA: NetCashMonthlyPoint[] = [
  { month: 'Jan', inflows_active: 620, inflows_oos:  80, inflows_demo: 40, outflows_financing: 680 },
  { month: 'Feb', inflows_active: 590, inflows_oos:  70, inflows_demo: 35, outflows_financing: 720 },
  { month: 'Mar', inflows_active: 640, inflows_oos:  90, inflows_demo: 45, outflows_financing: 700 },
  { month: 'Apr', inflows_active: 670, inflows_oos:  95, inflows_demo: 50, outflows_financing: 710 },
  { month: 'May', inflows_active: 690, inflows_oos: 100, inflows_demo: 55, outflows_financing: 715 },
  { month: 'Jun', inflows_active: 710, inflows_oos: 105, inflows_demo: 60, outflows_financing: 720 },
  { month: 'Jul', inflows_active: 720, inflows_oos: 110, inflows_demo: 60, outflows_financing: 725 },
  { month: 'Aug', inflows_active: 730, inflows_oos: 115, inflows_demo: 65, outflows_financing: 735 },
  { month: 'Sep', inflows_active: 745, inflows_oos: 120, inflows_demo: 65, outflows_financing: 740 },
  { month: 'Oct', inflows_active: 760, inflows_oos: 125, inflows_demo: 70, outflows_financing: 745 },
  { month: 'Nov', inflows_active: 770, inflows_oos: 130, inflows_demo: 70, outflows_financing: 750 },
  { month: 'Dec', inflows_active: 780, inflows_oos: 135, inflows_demo: 75, outflows_financing: 760 },
]

export async function GET() {
  return NextResponse.json(MOCK_DATA)
}
