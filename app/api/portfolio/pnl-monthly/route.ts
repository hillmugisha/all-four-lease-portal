import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface PnLMonthlyPoint {
  month: string
  revenue_active: number    // $K earned from active leases
  revenue_oos: number       // $K earned from out-of-service leases
  revenue_demo: number      // $K earned from demo leases
  interest_expense: number  // $K interest portion of financing payments (positive; rendered negative)
  depreciation: number      // $K straight-line depreciation charge (positive; rendered negative)
}

// Mock data (values in $K). Replace with a Supabase query when accrual-basis
// figures are available from the GL:
//   revenue  → monthly_payment grouped by vehicle_use_type/lease_status
//   interest → monthly_interest (interest-only portion, not full payment)
//   depreciation → monthly_depreciation_sl from pritchard_lease_portfolio
//
// YTD totals these mock figures produce:
//   Revenue:      $8.42M  (8,420K)
//   Interest:     $1.44M  (1,440K)
//   Depreciation: $5.76M  (5,760K)
//   Profit:      +$1.22M  (1,220K)
const MOCK_DATA: PnLMonthlyPoint[] = [
  { month: 'Jan', revenue_active: 424, revenue_oos: 109, revenue_demo: 72, interest_expense: 130, depreciation: 480 },
  { month: 'Feb', revenue_active: 406, revenue_oos: 104, revenue_demo: 70, interest_expense: 125, depreciation: 475 },
  { month: 'Mar', revenue_active: 438, revenue_oos: 113, revenue_demo: 74, interest_expense: 125, depreciation: 480 },
  { month: 'Apr', revenue_active: 455, revenue_oos: 117, revenue_demo: 78, interest_expense: 120, depreciation: 480 },
  { month: 'May', revenue_active: 473, revenue_oos: 122, revenue_demo: 80, interest_expense: 120, depreciation: 480 },
  { month: 'Jun', revenue_active: 487, revenue_oos: 125, revenue_demo: 83, interest_expense: 120, depreciation: 480 },
  { month: 'Jul', revenue_active: 501, revenue_oos: 129, revenue_demo: 85, interest_expense: 115, depreciation: 480 },
  { month: 'Aug', revenue_active: 515, revenue_oos: 133, revenue_demo: 87, interest_expense: 115, depreciation: 480 },
  { month: 'Sep', revenue_active: 525, revenue_oos: 135, revenue_demo: 90, interest_expense: 120, depreciation: 480 },
  { month: 'Oct', revenue_active: 536, revenue_oos: 138, revenue_demo: 91, interest_expense: 115, depreciation: 480 },
  { month: 'Nov', revenue_active: 550, revenue_oos: 141, revenue_demo: 94, interest_expense: 120, depreciation: 480 },
  { month: 'Dec', revenue_active: 588, revenue_oos: 151, revenue_demo: 101, interest_expense: 135, depreciation: 485 },
]

export async function GET() {
  return NextResponse.json(MOCK_DATA)
}
