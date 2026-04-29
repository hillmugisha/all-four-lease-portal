import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface LenderLOC {
  lender_name: string
  limit: number    // $M — total credit limit from this lender
  deployed: number // $M — amount currently drawn
}

// Mock data (values in $M). Replace with a Supabase query when a
// line_of_credit table or equivalent is available.
// Sorted largest → smallest by limit.
const MOCK_DATA: LenderLOC[] = [
  { lender_name: 'Union Leasing',    limit: 80, deployed: 59.2 },
  { lender_name: 'The Bancorp',      limit: 20, deployed: 15.8 },
  { lender_name: 'MBT Bank',         limit: 15, deployed: 10.5 },
  { lender_name: 'FTSB',             limit: 12, deployed:  8.0 },
  { lender_name: 'Ford Motor Credit',limit:  8, deployed:  4.6 },
  { lender_name: '1st Source Bank',  limit:  3, deployed:  0.9 },
  { lender_name: 'Bank Iowa',        limit:  2, deployed:  0.2 },
]

export async function GET() {
  return NextResponse.json(MOCK_DATA)
}
