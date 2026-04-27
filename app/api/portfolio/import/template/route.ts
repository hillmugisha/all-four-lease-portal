import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const TEMPLATE_HEADERS = [
  'Lease ID',
  // Customer
  'Company', 'Customer Name', 'Customer Type', 'Driver', 'Location', 'Phone', 'Email',
  'Billing Address', 'Billing City', 'Billing State', 'Billing ZIP',
  // Vehicle
  'Year', 'Make', 'Model', 'Color', 'VIN', 'Comments', 'GPS Serial #',
  'Vehicle Acquisition Date', 'Vehicle Use Type',
  // Dates
  'Lease Start', 'Lease End', 'Term (mo.)', 'NDVR Date', 'Out of Service Date',
  'Insurance Exp. Date', 'First Liability Pmt Date', 'Registration Date',
  // Odometer
  'Odometer', 'Odometer Date', 'Sold Odometer',
  // Financials
  'Net Cap Cost', 'Mon. Depreciation', 'Mon. Interest', 'Mon. Tax', 'Mon. Payment',
  'Lease End Residual', 'Tax Paid Upfront', 'Acquisition Fee', 'Incentive Recognition', 'Mon. Cash Flow',
  // Lease Terms
  'Annual Miles', 'Lease End Mile Fee', 'Title State', 'Plate #', 'Tax Type',
  // Lender
  'Lender', 'Loan/Lease #', 'Liability Start', 'Liability End', 'Funding Amount',
  'Monthly Liability Pmt.', 'Balloon Payment', 'Mon. Dep. (SL)', 'Lender Int. Rate',
  'Lender Term', 'Lender Type', 'Liability Balance', 'Net Book Value',
  // Classification
  'Contract Structure', 'Lease Type', 'Onboard Type',
  // Sale & Disposition
  'Sold Date', 'Disposal Date', 'Net Sale Price', 'MMR', 'Days to Sell',
  'Disposition Fees', 'Early Term Fees',
]

export async function GET() {
  // Single empty row with just the headers
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const buf = Buffer.from(raw)

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="portfolio-import-template.xlsx"',
    },
  })
}
