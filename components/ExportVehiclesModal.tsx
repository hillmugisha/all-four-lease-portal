'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp, Download, Minus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'

// ─── Column definitions ───────────────────────────────────────────────────────

interface ExportCol {
  label: string
  key:   keyof LeasePortfolioRecord
}

interface ColGroup {
  name:     string
  required: boolean
  cols:     ExportCol[]
}

const GROUPS: ColGroup[] = [
  {
    name: 'Identifiers',
    required: true,
    cols: [
      { label: 'Lease ID', key: 'lease_id' },
    ],
  },
  {
    name: 'Status',
    required: false,
    cols: [
      { label: 'Lease Status',       key: 'lease_status' },
      { label: 'Onboard Type',       key: 'onboard_type' },
      { label: 'Contract Structure', key: 'contract_structure' },
      { label: 'Lease Type',         key: 'lease_type' },
    ],
  },
  {
    name: 'Customer',
    required: false,
    cols: [
      { label: 'Company',       key: 'company_name' },
      { label: 'Customer Name', key: 'customer_name' },
      { label: 'Customer Type', key: 'customer_type' },
      { label: 'Driver',        key: 'driver' },
      { label: 'Location',      key: 'location' },
      { label: 'Phone',         key: 'phone' },
      { label: 'Email',         key: 'email_address' },
    ],
  },
  {
    name: 'Billing',
    required: false,
    cols: [
      { label: 'Billing Address', key: 'billing_address' },
      { label: 'Billing City',    key: 'billing_city' },
      { label: 'Billing State',   key: 'billing_state' },
      { label: 'Billing ZIP',     key: 'billing_zip_code' },
    ],
  },
  {
    name: 'Vehicle',
    required: false,
    cols: [
      { label: 'Year',                     key: 'model_year' },
      { label: 'Make',                     key: 'make' },
      { label: 'Model',                    key: 'model' },
      { label: 'Color',                    key: 'color' },
      { label: 'VIN',                      key: 'vin' },
      { label: 'Comments',                 key: 'comments' },
      { label: 'GPS Serial #',             key: 'gps_serial_number' },
      { label: 'Vehicle Acquisition Date', key: 'vehicle_acquisition_date' },
      { label: 'Vehicle Use Type',         key: 'vehicle_use_type' },
      { label: 'MLA Flag',                 key: 'mla_flag' },
    ],
  },
  {
    name: 'Odometer',
    required: false,
    cols: [
      { label: 'Odometer',      key: 'odometer' },
      { label: 'Odometer Date', key: 'odometer_date' },
      { label: 'Sold Odometer', key: 'odometer_at_time_of_sale' },
    ],
  },
  {
    name: 'Dates',
    required: false,
    cols: [
      { label: 'Lease Start',              key: 'lease_start_date' },
      { label: 'Lease End',                key: 'lease_end_date' },
      { label: 'Term (mo.)',               key: 'term' },
      { label: 'NDVR Date',                key: 'ndvr_date' },
      { label: 'Out of Service Date',      key: 'out_of_service_date' },
      { label: 'Insurance Exp. Date',      key: 'insurance_expiration_date' },
      { label: 'First Liability Pmt Date', key: 'first_liability_payment_date' },
    ],
  },
  {
    name: 'Lease Terms',
    required: false,
    cols: [
      { label: 'Annual Miles',       key: 'annual_miles_limit' },
      { label: 'Lease End Mile Fee', key: 'lease_end_mile_fee' },
      { label: 'Title State',        key: 'title_state' },
      { label: 'Registration Date',  key: 'registration_date' },
      { label: 'Plate #',            key: 'plate_number' },
      { label: 'Tax Type',           key: 'tax_type' },
    ],
  },
  {
    name: 'Financials',
    required: false,
    cols: [
      { label: 'Net Cap Cost',          key: 'net_cap_cost' },
      { label: 'Mon. Depreciation',     key: 'monthly_depreciation' },
      { label: 'Mon. Interest',         key: 'monthly_interest' },
      { label: 'Mon. Tax',              key: 'monthly_tax' },
      { label: 'Mon. Payment',          key: 'monthly_payment' },
      { label: 'Lease End Residual',    key: 'lease_end_residual' },
      { label: 'Tax Paid Upfront',      key: 'tax_paid_upfront' },
      { label: 'Acquisition Fee',       key: 'acquisition_fee' },
      { label: 'Incentive Recognition', key: 'incentive_recognition' },
      { label: 'Mon. Cash Flow',        key: 'monthly_cash_flow' },
    ],
  },
  {
    name: 'Sale & Disposition',
    required: false,
    cols: [
      { label: 'Sold Date',        key: 'sold_date' },
      { label: 'Disposal Date',    key: 'disposal_date' },
      { label: 'Net Sale Price',   key: 'net_sale_price' },
      { label: 'MMR',              key: 'mmr' },
      { label: 'Days to Sell',     key: 'days_to_sell' },
      { label: 'Disposition Fees', key: 'disposition_fees' },
      { label: 'Early Term Fees',  key: 'early_term_fees' },
    ],
  },
  {
    name: 'Lender',
    required: false,
    cols: [
      { label: 'Lender',                  key: 'lender' },
      { label: 'Loan/Lease #',            key: 'lender_loan_lease_number' },
      { label: 'Liability Start',         key: 'liability_start_date' },
      { label: 'Liability End',           key: 'liability_end_date' },
      { label: 'Funding Amount',          key: 'funding_amount' },
      { label: 'Monthly Liability Pmt.',  key: 'monthly_liability_payment' },
      { label: 'Balloon Payment',         key: 'balloon_payment' },
      { label: 'Mon. Dep. (SL)',          key: 'monthly_depreciation_sl' },
      { label: 'Lender Int. Rate',        key: 'lender_interest_rate' },
      { label: 'Lender Term',             key: 'lender_term' },
      { label: 'Lender Type',             key: 'lender_type' },
      { label: 'Liability Balance',       key: 'liability_balance' },
      { label: 'Net Book Value',          key: 'net_book_value' },
    ],
  },
]

// All optional column labels (used for Select All)
const ALL_OPTIONAL_LABELS: string[] = GROUPS.flatMap((g) =>
  g.required ? [] : g.cols.map((c) => c.label)
)

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  records: LeasePortfolioRecord[]
}

export default function ExportVehiclesModal({ open, onClose, records }: Props) {
  // checked set holds only optional column labels (required are always exported)
  const [checked,  setChecked]  = useState<Set<string>>(new Set(ALL_OPTIONAL_LABELS))
  const [expanded, setExpanded] = useState<Set<string>>(new Set(GROUPS.map((g) => g.name)))

  if (!open) return null

  // ── Select All helpers ────────────────────────────────────────────────────

  const allChecked  = checked.size === ALL_OPTIONAL_LABELS.length
  const noneChecked = checked.size === 0
  const partial     = !allChecked && !noneChecked

  function toggleSelectAll() {
    setChecked(allChecked ? new Set() : new Set(ALL_OPTIONAL_LABELS))
  }

  // ── Group-level helpers ───────────────────────────────────────────────────

  function groupState(group: ColGroup): 'all' | 'none' | 'partial' {
    if (group.required) return 'all'
    const labels = group.cols.map((c) => c.label)
    const n = labels.filter((l) => checked.has(l)).length
    if (n === 0) return 'none'
    if (n === labels.length) return 'all'
    return 'partial'
  }

  function toggleGroup(group: ColGroup) {
    if (group.required) return
    const labels = group.cols.map((c) => c.label)
    const state  = groupState(group)
    setChecked((prev) => {
      const next = new Set(prev)
      if (state === 'all') labels.forEach((l) => next.delete(l))
      else labels.forEach((l) => next.add(l))
      return next
    })
  }

  function toggleCol(label: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function toggleExpanded(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function handleExport() {
    // Build ordered column list: required first, then selected optional in group order
    const exportCols: ExportCol[] = [
      ...GROUPS.filter((g) => g.required).flatMap((g) => g.cols),
      ...GROUPS.filter((g) => !g.required).flatMap((g) =>
        g.cols.filter((c) => checked.has(c.label))
      ),
    ]

    const rows = records.map((r) => {
      const row: Record<string, unknown> = {}
      for (const col of exportCols) {
        const val = r[col.key]
        row[col.label] = val ?? ''
      }
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lease Portfolio')
    XLSX.writeFile(wb, `lease-portfolio-${new Date().toISOString().slice(0, 10)}.xlsx`)
    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full max-w-2xl rounded-xl bg-white shadow-2xl" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Export to Excel</h2>
            <p className="text-xs text-gray-400 mt-0.5">{records.length} record{records.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Column picker */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-xs font-medium text-gray-700">Please select which columns you want to include in the sheet:</p>

          {/* Select All row */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                allChecked
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : partial
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {partial ? <Minus size={10} strokeWidth={3} /> : allChecked ? <span className="block w-2 h-2 bg-white rounded-sm" /> : null}
            </button>
            <span className="text-xs font-medium text-gray-700">Select All</span>
          </div>

          {/* Groups */}
          {GROUPS.map((group) => {
            const state   = groupState(group)
            const isOpen  = expanded.has(group.name)

            return (
              <div key={group.name} className="border border-gray-100 rounded-lg overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 cursor-pointer select-none"
                  onClick={() => toggleExpanded(group.name)}>
                  {/* Group checkbox */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleGroup(group) }}
                    disabled={group.required}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      group.required
                        ? 'border-gray-300 bg-gray-200 cursor-not-allowed'
                        : state === 'all'
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : state === 'partial'
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {state === 'partial' ? (
                      <Minus size={10} strokeWidth={3} className="text-white" />
                    ) : state === 'all' ? (
                      <span className="block w-2 h-2 bg-white rounded-sm" />
                    ) : null}
                  </button>

                  <span className="flex-1 text-xs font-semibold text-gray-800">{group.name}</span>
                  {group.required && (
                    <span className="text-xs text-gray-400 font-normal">(Required)</span>
                  )}
                  {isOpen ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                </div>

                {/* Group columns */}
                {isOpen && (
                  <div className="px-3 py-2.5 grid grid-cols-3 gap-x-4 gap-y-2">
                    {group.cols.map((col) => {
                      const isChecked = group.required || checked.has(col.label)
                      return (
                        <label
                          key={col.label}
                          className={`flex items-center gap-1.5 ${group.required ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={group.required}
                            onChange={() => !group.required && toggleCol(col.label)}
                            className={`h-3.5 w-3.5 rounded border-gray-300 ${
                              group.required
                                ? 'accent-gray-400 cursor-not-allowed'
                                : 'accent-brand-600 cursor-pointer'
                            }`}
                          />
                          <span className={`text-xs ${group.required ? 'text-gray-400' : 'text-gray-700'}`}>
                            {col.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={handleExport}
            className="btn-primary flex items-center gap-1.5"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
