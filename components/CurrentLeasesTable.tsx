'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { CurrentLeaseRecord } from '@/lib/current-lease-types'
import { Eye, RefreshCw, X, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const PAGE_SIZE = 100

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—'
  try {
    return new Date(v + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch { return v }
}

function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

// For columns that can be numeric OR free text (e.g. "Paid Upfront", "Exempt")
function fmtMoneyOrText(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return fmtMoney(v)
  const trimmed = v.trim()
  if (!trimmed) return '—'
  const n = parseFloat(trimmed.replace(/[$,]/g, ''))
  return isNaN(n) ? trimmed : fmtMoney(n)
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = status === 'Active'
    ? 'bg-green-50 text-green-700'
    : 'bg-gray-100 text-gray-600'
  return (
    <span className={clsx('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', color)}>
      {status}
    </span>
  )
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DR({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined ? '—' : value
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500 shrink-0 mr-4">{label}</span>
      <span className="font-medium text-gray-900 text-right break-all">{display}</span>
    </div>
  )
}

function MS({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{title}</h3>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-1 mb-4">{children}</div>
    </div>
  )
}

function CurrentLeaseDetailModal({
  lease, onClose,
}: { lease: CurrentLeaseRecord; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-gray-50 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {lease.customer_name ?? lease.company ?? '—'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {[lease.year, lease.make, lease.model].filter(Boolean).join(' ')}
              {lease.vin ? <> &nbsp;·&nbsp; <span className="font-mono">{lease.vin}</span></> : null}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <StatusBadge status={lease.lease_status} />
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-1">
          <MS title="Customer">
            <DR label="Company"         value={lease.company} />
            <DR label="Customer Name"   value={lease.customer_name} />
            <DR label="Customer Type"   value={lease.customer_type} />
            <DR label="Location/Driver" value={lease.location_driver} />
            <DR label="Payment Method"  value={lease.payment_method} />
            <DR label="Phone"           value={lease.phone} />
            <DR label="Email"           value={lease.email_address} />
          </MS>

          <MS title="Billing Address">
            <DR label="Address"  value={lease.billing_address} />
            <DR label="City"     value={lease.billing_city} />
            <DR label="State"    value={lease.billing_state} />
            <DR label="ZIP"      value={lease.billing_zip_code} />
          </MS>

          <MS title="Vehicle">
            <DR label="Year"      value={lease.year} />
            <DR label="Make"      value={lease.make} />
            <DR label="Model"     value={lease.model} />
            <DR label="Color"     value={lease.color} />
            <DR label="VIN"       value={lease.vin} />
            <DR label="Odometer"  value={lease.odometer != null ? `${Number(lease.odometer).toLocaleString()} mi` : null} />
            <DR label="Odometer Date" value={fmtDate(lease.odometer_date)} />
            <DR label="Plate #"   value={lease.plate_number} />
            <DR label="Color"     value={lease.color} />
            <DR label="GPS Serial" value={lease.gps_serial_number} />
          </MS>

          <MS title="Lease Terms (Customer)">
            <DR label="New/Swap/Addition"  value={lease.new_swap_addition} />
            <DR label="Lease Start Date"   value={fmtDate(lease.lease_start_date)} />
            <DR label="Lease End Date"     value={fmtDate(lease.lease_end_date)} />
            <DR label="Term"               value={lease.term != null ? `${lease.term} months` : null} />
            <DR label="Annual Miles"       value={lease.annual_miles != null ? Number(lease.annual_miles).toLocaleString() : null} />
            <DR label="Lease End Mile Fee" value={lease.lease_end_mile_fee != null ? `$${lease.lease_end_mile_fee}/mi` : null} />
          </MS>

          <MS title="Financials (Customer)">
            <DR label="Net Cap Cost"        value={fmtMoney(lease.net_cap_cost)} />
            <DR label="Monthly Dep."        value={fmtMoney(lease.mon_dep)} />
            <DR label="Monthly Interest"    value={fmtMoney(lease.mon_interest)} />
            <DR label="Monthly Tax"         value={fmtMoneyOrText(lease.monthly_tax)} />
            <DR label="Monthly Payment"     value={fmtMoney(lease.mon_payment)} />
            <DR label="Residual/Resale"     value={fmtMoney(lease.residual_resale_quote)} />
            <DR label="Upfront Tax Paid"    value={fmtMoney(lease.upfront_tax_paid)} />
            <DR label="TTL State"           value={lease.ttl_state} />
            <DR label="TTL Mo."             value={fmtMoney(lease.ttl_mo)} />
            <DR label="Lease Dep. (months)" value={lease.lease_depreciation_months != null ? String(Math.round(Number(lease.lease_depreciation_months))) : null} />
          </MS>

          <MS title="Lender / Financing">
            <DR label="Lender / Lessor"        value={lease.lender_lessor} />
            <DR label="Loan/Lease #"           value={lease.loan_lease_number} />
            <DR label="Loan/Lease Start"       value={fmtDate(lease.loan_lease_start_date)} />
            <DR label="Loan/Lease End"         value={fmtDate(lease.loan_lease_end_date)} />
            <DR label="Monthly Payment (Lender)" value={fmtMoney(lease.monthly_payment)} />
            <DR label="Lender Net Cap Cost"    value={fmtMoney(lease.lender_net_cap_cost)} />
            <DR label="Balloon / Residual"     value={fmtMoney(lease.balloon_residual)} />
            <DR label="Monthly Dep. (Lender)"  value={fmtMoney(lease.monthly_depreciation_lender)} />
            <DR label="Lender Int. Rate"       value={lease.lender_int_rate_pct != null ? `${(Number(lease.lender_int_rate_pct) * 100).toFixed(3)}%` : null} />
            <DR label="Lender Term"            value={lease.lender_term} />
            <DR label="Lender Mo. Dep. %"      value={lease.lender_mo_dep_pct != null ? `${(Number(lease.lender_mo_dep_pct) * 100).toFixed(4)}%` : null} />
            <DR label="Internal Book Value"    value={fmtMoney(lease.internal_book_value)} />
            <DR label="In-Service Date"        value={lease.in_service_date} />
          </MS>

          <MS title="Cash Flow">
            <DR label="Monthly Cash Flow Delta" value={fmtMoney(lease.monthly_cash_flow_delta)} />
            <DR label="Prorate Pd."             value={fmtMoney(lease.prorate_pd)} />
            <DR label="Prorate Rcvd."           value={fmtMoney(lease.prorate_rcvd)} />
          </MS>

          <MS title="Book Values">
            <DR label="MMR"                     value={fmtMoney(lease.mmr)} />
            <DR label="Balance Sheet (Mar 2026)" value={fmtMoney(lease.balance_sheet_mar_2026)} />
            <DR label="Balance Sheet Delta"     value={fmtMoney(lease.bal_sheet_delta)} />
            <DR label="NBV (Apr 2026)"          value={fmtMoney(lease.nbv_apr_2026)} />
            <DR label="NBV Delta"               value={fmtMoney(lease.nbv_delta)} />
            <DR label="Balance Sheet (Apr 9 2026)" value={fmtMoney(lease.balance_sheet_apr_09_2026)} />
            <DR label="Customer Lease Depreciated BV" value={fmtMoney(lease.customer_lease_depreciated_book_value)} />
            <DR label="Invoice to Retail"       value={fmtMoney(lease.invoice_to_retail)} />
          </MS>

          <MS title="Disposal / Payoff">
            <DR label="Days to Sell"            value={lease.days_to_sell} />
            <DR label="Payoff Quoted/Paid"      value={fmtMoney(lease.payoff_quoted_paid)} />
            <DR label="Payoff Proceeds Sent"    value={fmtMoney(lease.payoff_proceeds_sent)} />
            <DR label="90-Day Disposal Notes"   value={lease.disposal_comments_90_day} />
          </MS>

          <MS title="Other">
            <DR label="NDVR/Delivery Date"      value={fmtDate(lease.ndvr_delivery_date)} />
            <DR label="Insurance Expiration"    value={lease.insurance_expiration_date} />
            <DR label="Account Manager"         value={lease.account_manager} />
            <DR label="Location"                value={lease.location} />
            <DR label="AM"                      value={lease.am} />
            <DR label="VIN (2)"                 value={lease.vin_2} />
            <DR label="Comments"                value={lease.comments} />
            <DR label="Additional Comments"     value={lease.additional_comments} />
            <DR label="Lease Status"            value={lease.lease_status} />
          </MS>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Resizable column header ──────────────────────────────────────────────────

function ResizableTh({
  width, onResize, children, className,
}: {
  width: number
  onResize: (delta: number) => void
  children: React.ReactNode
  className?: string
}) {
  const startX = useRef<number | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startX.current = e.clientX
    function onMove(ev: MouseEvent) {
      if (startX.current === null) return
      onResize(ev.clientX - startX.current)
      startX.current = ev.clientX
    }
    function onUp() {
      startX.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onResize])

  return (
    <th
      style={{ width, minWidth: 60, position: 'relative' }}
      className={clsx(
        'select-none border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500',
        className
      )}
    >
      {children}
      <span
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-400 transition-colors"
        style={{ touchAction: 'none' }}
      />
    </th>
  )
}

// ─── Filters ──────────────────────────────────────────────────────────────────

interface Filters {
  name:   string
  lender: string
  make:   string
  company: string
}

function FilterSelect({
  label, value, onChange, options, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <div className="min-w-[130px]">
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input py-1.5 text-sm appearance-none pr-7 w-full"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  )
}

function FiltersBar({
  filters, onChange, lenders, makes, companies,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  lenders: string[]
  makes: string[]
  companies: string[]
}) {
  function set(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value })
  }
  const hasAny = Object.values(filters).some(Boolean)

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="relative min-w-[180px] flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500">Customer Name</label>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            value={filters.name}
            onChange={(e) => set('name', e.target.value)}
            className="input pl-7 py-1.5 text-sm"
          />
        </div>
      </div>

      <FilterSelect
        label="Company"
        value={filters.company}
        onChange={(v) => set('company', v)}
        options={companies}
        placeholder="All companies"
      />

      <FilterSelect
        label="Make"
        value={filters.make}
        onChange={(v) => set('make', v)}
        options={makes}
        placeholder="All makes"
      />

      <FilterSelect
        label="Lender / Lessor"
        value={filters.lender}
        onChange={(v) => set('lender', v)}
        options={lenders}
        placeholder="All lenders"
      />

      {hasAny && (
        <div className="self-end">
          <button
            onClick={() => onChange({ name: '', lender: '', make: '', company: '' })}
            className="btn-secondary py-1.5 text-xs"
          >
            <X size={12} />
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COL_HEADERS = [
  'Details', 'Lease Status', 'Company', 'Customer Name',
  'Monthly Depreciation', 'Monthly Interest', 'Monthly Tax', 'VIN',
  'Customer Type', 'Lease Type',
  'Lease Start', 'Lease End', 'Monthly Payment',
  'Payment Method', 'Monthly Cash Flow', 'Lender / Lessor',
]
const DEFAULT_WIDTHS = [80, 110, 160, 170, 145, 130, 115, 160, 140, 110, 115, 115, 140, 130, 140, 170]

// ─── Main component ───────────────────────────────────────────────────────────

interface TableProps {
  leases: CurrentLeaseRecord[]
  loading: boolean
  onRefresh: () => void
}

export default function CurrentLeasesTable({ leases, loading, onRefresh }: TableProps) {
  const [selected, setSelected]   = useState<CurrentLeaseRecord | null>(null)
  const [filters, setFilters]     = useState<Filters>({ name: '', lender: '', make: '', company: '' })
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_WIDTHS)
  const [page, setPage]           = useState(1)

  const lenders = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.lender_lessor).filter(Boolean) as string[])).sort(),
    [leases]
  )
  const makes = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.make).filter(Boolean) as string[])).sort(),
    [leases]
  )
  const companies = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.company).filter(Boolean) as string[])).sort(),
    [leases]
  )

  const filtered = useMemo(() => leases.filter((l) => {
    if (filters.name    && !(l.customer_name ?? '').toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.company && l.company !== filters.company)       return false
    if (filters.make    && l.make !== filters.make)             return false
    if (filters.lender  && l.lender_lessor !== filters.lender)  return false
    return true
  }), [leases, filters])

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  // Page number list with ellipsis — computed outside JSX to avoid TSX generic syntax issues
  const pageNumbers = useMemo((): (number | string)[] => {
    const visible = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    const result: (number | string)[] = []
    visible.forEach((p, idx) => {
      if (idx > 0 && p - (visible[idx - 1]) > 1) result.push('…')
      result.push(p)
    })
    return result
  }, [totalPages, page])

  const hasFilters = Object.values(filters).some(Boolean)

  function resizeCol(i: number, delta: number) {
    setColWidths((prev) => prev.map((w, idx) => idx === i ? Math.max(60, w + delta) : w))
  }

  return (
    <>
      {!loading && leases.length > 0 && (
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          lenders={lenders}
          makes={makes}
          companies={companies}
        />
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Current Lease Records</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasFilters ? `${filtered.length} of ${leases.length}` : leases.length} total
              {totalPages > 1 && ` · page ${page} of ${totalPages}`}
            </p>
          </div>
          <button onClick={onRefresh} className="btn-secondary py-1.5 text-xs" disabled={loading}>
            <RefreshCw size={13} className={clsx(loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
                <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {/* Empty — no records */}
        {!loading && leases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-semibold text-gray-800">No current lease records</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Run the import script to populate data from Active Leases.xlsx.
            </p>
          </div>
        )}

        {/* Empty — filters */}
        {!loading && leases.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-sm text-gray-500">No leases match your filters.</p>
            <button
              onClick={() => setFilters({ name: '', lender: '', make: '', company: '' })}
              className="mt-2 text-xs text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Resizable table */}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
            <table
              style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) }}
              className="border-collapse text-sm"
            >
              <thead>
                <tr className="border-b border-gray-200">
                  {COL_HEADERS.map((h, i) => (
                    <ResizableTh key={h} width={colWidths[i]} onResize={(d) => resizeCol(i, d)}>
                      {h}
                    </ResizableTh>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50 transition-colors">
                    {/* Details */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <button
                        onClick={() => setSelected(lease)}
                        className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <Eye size={11} />
                        View
                      </button>
                    </td>
                    {/* Lease Status */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {lease.lease_status ?? 'Active'}
                      </span>
                    </td>
                    {/* Company */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="truncate text-gray-800">{lease.company ?? '—'}</div>
                    </td>
                    {/* Customer Name */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="font-medium text-gray-900 truncate">{lease.customer_name ?? '—'}</div>
                    </td>
                    {/* Monthly Depreciation */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-800">
                      {fmtMoney(lease.mon_dep)}
                    </td>
                    {/* Monthly Interest */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-800">
                      {fmtMoney(lease.mon_interest)}
                    </td>
                    {/* Monthly Tax */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-800">
                      {fmtMoneyOrText(lease.monthly_tax)}
                    </td>
                    {/* VIN */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <span className="truncate block font-mono text-xs text-gray-600">{lease.vin ?? '—'}</span>
                    </td>
                    {/* Customer Type */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="truncate text-xs text-gray-700">{lease.customer_type ?? '—'}</div>
                    </td>
                    {/* Lease Type (New/Swap/Addition) */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <div className="truncate text-xs text-gray-700">{lease.new_swap_addition ?? '—'}</div>
                    </td>
                    {/* Lease Start */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                      {fmtDate(lease.lease_start_date)}
                    </td>
                    {/* Lease End */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                      {fmtDate(lease.lease_end_date)}
                    </td>
                    {/* Monthly Payment */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap font-medium text-gray-900">
                      {fmtMoney(lease.mon_payment)}
                    </td>
                    {/* Payment Method */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="truncate text-xs text-gray-700">{lease.payment_method ?? '—'}</div>
                    </td>
                    {/* Monthly Cash Flow */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap font-medium">
                      {lease.monthly_cash_flow_delta != null ? (
                        <span className={lease.monthly_cash_flow_delta >= 0 ? 'text-green-700' : 'text-red-600'}>
                          {fmtMoney(lease.monthly_cash_flow_delta)}
                        </span>
                      ) : '—'}
                    </td>
                    {/* Lender / Lessor */}
                    <td className="px-3 py-2.5 overflow-hidden">
                      <span className="truncate block text-xs text-gray-600">{lease.lender_lessor ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={13} /> Prev
              </button>

              {/* Page number pills */}
              {pageNumbers.map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx(
                      'min-w-[28px] rounded px-2 py-1 text-xs font-medium',
                      page === p
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={13} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <CurrentLeaseDetailModal lease={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
