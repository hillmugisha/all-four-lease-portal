'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { ExpiredLeaseRecord } from '@/lib/expired-lease-types'
import { Eye, RefreshCw, X, Search, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import { fmtDate, fmtMoney, fmtMoneyOrText, DR, MS } from '@/lib/table-utils'

const PAGE_SIZE = 100

// ─── Detail modal ──────────────────────────────────────────────────────────────

function ExpiredLeaseDetailModal({
  lease, onClose,
}: { lease: ExpiredLeaseRecord; onClose: () => void }) {
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
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
              Expired
            </span>
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
          <MS title="Lease">
            <DR label="Expired Date"    value={fmtDate(lease.expired_date)} />
            <DR label="Lease Start"     value={fmtDate(lease.lease_start_date)} />
            <DR label="Lease End"       value={fmtDate(lease.lease_end_date)} />
            <DR label="Term"            value={lease.term != null ? `${lease.term} months` : null} />
            <DR label="NDVR Date"       value={fmtDate(lease.ndvr_date)} />
          </MS>

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
            <DR label="Address" value={lease.billing_address} />
            <DR label="City"    value={lease.billing_city} />
            <DR label="State"   value={lease.billing_state} />
            <DR label="ZIP"     value={lease.billing_zip_code} />
          </MS>

          <MS title="Vehicle">
            <DR label="Year"         value={lease.year} />
            <DR label="Make"         value={lease.make} />
            <DR label="Model"        value={lease.model} />
            <DR label="Color"        value={lease.color} />
            <DR label="VIN"          value={lease.vin} />
            <DR label="Odometer"     value={lease.odometer != null ? `${Number(lease.odometer).toLocaleString()} mi` : null} />
            <DR label="Odometer Date" value={fmtDate(lease.odometer_date)} />
            <DR label="Plate #"      value={lease.plate_number} />
          </MS>

          <MS title="Lease Terms">
            <DR label="Annual Miles"       value={lease.annual_miles != null ? Number(lease.annual_miles).toLocaleString() : null} />
            <DR label="Lease End Mile Fee" value={lease.lease_end_mile_fee != null ? `$${lease.lease_end_mile_fee}/mi` : null} />
            <DR label="TTL State"          value={lease.ttl_state} />
            <DR label="TTL Mo."            value={fmtMoney(lease.ttl_mo)} />
          </MS>

          <MS title="Financials (Customer)">
            <DR label="Net Cap Cost"     value={fmtMoney(lease.net_cap_cost)} />
            <DR label="Monthly Dep."     value={fmtMoney(lease.mon_dep)} />
            <DR label="Monthly Interest" value={fmtMoney(lease.mon_interest)} />
            <DR label="Monthly Tax"      value={fmtMoneyOrText(lease.monthly_tax)} />
            <DR label="Monthly Payment"  value={fmtMoney(lease.mon_payment)} />
            <DR label="Residual/Resale"  value={fmtMoney(lease.residual_resale_quote)} />
          </MS>

          <MS title="Lender / Financing">
            <DR label="Lender / Lessor"          value={lease.lender_lessor} />
            <DR label="Loan/Lease #"             value={lease.loan_lease_number} />
            <DR label="Loan/Lease Start"         value={fmtDate(lease.loan_lease_start_date)} />
            <DR label="Loan/Lease End"           value={fmtDate(lease.loan_lease_end_date)} />
            <DR label="Monthly Payment (Lender)" value={fmtMoney(lease.monthly_payment)} />
            <DR label="Lender Net Cap Cost"      value={fmtMoney(lease.lender_net_cap_cost)} />
            <DR label="Balloon / Residual"       value={fmtMoney(lease.balloon_residual)} />
            <DR label="Monthly Dep. (Lender)"    value={fmtMoney(lease.monthly_depreciation_lender)} />
            <DR label="Lender Int. Rate"         value={lease.lender_int_rate_pct != null ? `${(Number(lease.lender_int_rate_pct) * 100).toFixed(3)}%` : null} />
          </MS>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Resizable column header ───────────────────────────────────────────────────

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
  name:         string
  make:         string
  company:      string
  customerType: string
  term:         string
  lender:       string
}

const EMPTY_FILTERS: Filters = {
  name: '', make: '', company: '', customerType: '', term: '', lender: '',
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
  filters, onChange, makes, companies, customerTypes, terms, lenders,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  makes: string[]
  companies: string[]
  customerTypes: string[]
  terms: string[]
  lenders: string[]
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

      <FilterSelect label="Company"       value={filters.company}      onChange={(v) => set('company', v)}      options={companies}     placeholder="All companies" />
      <FilterSelect label="Make"          value={filters.make}         onChange={(v) => set('make', v)}         options={makes}         placeholder="All makes" />
      <FilterSelect label="Customer Type" value={filters.customerType} onChange={(v) => set('customerType', v)} options={customerTypes}  placeholder="All types" />
      <FilterSelect label="Term"          value={filters.term}         onChange={(v) => set('term', v)}         options={terms}         placeholder="All terms" />
      <FilterSelect label="Lender"        value={filters.lender}       onChange={(v) => set('lender', v)}       options={lenders}       placeholder="All lenders" />

      {hasAny && (
        <div className="self-end">
          <button onClick={() => onChange(EMPTY_FILTERS)} className="btn-secondary py-1.5 text-xs">
            <X size={12} />
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Excel export ──────────────────────────────────────────────────────────────

function exportToExcel(records: ExpiredLeaseRecord[]) {
  const rows = records.map((l) => ({
    'Expired Date':               l.expired_date ?? '',
    'Company':                    l.company ?? '',
    'Customer Name':              l.customer_name ?? '',
    'Customer Type':              l.customer_type ?? '',
    'Location/Driver':            l.location_driver ?? '',
    'Payment Method':             l.payment_method ?? '',
    'Phone':                      l.phone ?? '',
    'Email':                      l.email_address ?? '',
    'Billing Address':            l.billing_address ?? '',
    'Billing City':               l.billing_city ?? '',
    'Billing State':              l.billing_state ?? '',
    'Billing ZIP':                l.billing_zip_code ?? '',
    'Year':                       l.year ?? '',
    'Make':                       l.make ?? '',
    'Model':                      l.model ?? '',
    'Color':                      l.color ?? '',
    'VIN':                        l.vin ?? '',
    'Odometer':                   l.odometer ?? '',
    'Odometer Date':              l.odometer_date ?? '',
    'Plate #':                    l.plate_number ?? '',
    'NDVR Date':                  l.ndvr_date ?? '',
    'Lease Start Date':           l.lease_start_date ?? '',
    'Lease End Date':             l.lease_end_date ?? '',
    'Term (months)':              l.term ?? '',
    'Annual Miles':               l.annual_miles ?? '',
    'Lease End Mile Fee':         l.lease_end_mile_fee ?? '',
    'TTL State':                  l.ttl_state ?? '',
    'TTL Monthly':                l.ttl_mo ?? '',
    'Net Cap Cost':               l.net_cap_cost ?? '',
    'Monthly Depreciation':       l.mon_dep ?? '',
    'Monthly Interest':           l.mon_interest ?? '',
    'Monthly Tax':                l.monthly_tax ?? '',
    'Monthly Payment (Customer)': l.mon_payment ?? '',
    'Residual/Resale':            l.residual_resale_quote ?? '',
    'Lender / Lessor':            l.lender_lessor ?? '',
    'Loan/Lease #':               l.loan_lease_number ?? '',
    'Loan/Lease Start':           l.loan_lease_start_date ?? '',
    'Loan/Lease End':             l.loan_lease_end_date ?? '',
    'Monthly Payment (Lender)':   l.monthly_payment ?? '',
    'Lender Net Cap Cost':        l.lender_net_cap_cost ?? '',
    'Balloon / Residual':         l.balloon_residual ?? '',
    'Monthly Dep. (Lender)':      l.monthly_depreciation_lender ?? '',
    'Lender Interest Rate %':     l.lender_int_rate_pct ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Expired Leases')
  XLSX.writeFile(wb, `expired-leases-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ─── Column definitions ────────────────────────────────────────────────────────

const COL_HEADERS = [
  'Details', 'Expired Date', 'Company', 'Customer Name',
  'Year / Make / Model', 'VIN', 'Customer Type',
  'Lease Start', 'Lease End', 'Monthly Payment',
  'Lender / Lessor',
]
const DEFAULT_WIDTHS = [80, 120, 150, 170, 180, 155, 130, 115, 115, 140, 170]

// ─── Main component ────────────────────────────────────────────────────────────

interface TableProps {
  leases: ExpiredLeaseRecord[]
  loading: boolean
  onRefresh: () => void
}

export default function ExpiredLeasesTable({ leases, loading, onRefresh }: TableProps) {
  const [selected, setSelected]   = useState<ExpiredLeaseRecord | null>(null)
  const [filters, setFilters]     = useState<Filters>(EMPTY_FILTERS)
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_WIDTHS)
  const [page, setPage]           = useState(1)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const makes = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.make).filter(Boolean) as string[])).sort(),
    [leases]
  )
  const companies = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.company).filter(Boolean) as string[])).sort(),
    [leases]
  )
  const customerTypes = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.customer_type).filter(Boolean) as string[])).sort(),
    [leases]
  )
  const terms = useMemo(() =>
    Array.from(new Set(leases.map((l) => (l.term ?? '').toString().trim()).filter(Boolean)))
      .sort((a, b) => {
        const na = parseFloat(a), nb = parseFloat(b)
        return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb
      }),
    [leases]
  )
  const lenders = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.lender_lessor).filter(Boolean) as string[])).sort(),
    [leases]
  )

  const filtered = useMemo(() => leases.filter((l) => {
    if (filters.name         && !(l.customer_name ?? '').toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.company      && l.company !== filters.company)                                               return false
    if (filters.make         && l.make !== filters.make)                                                     return false
    if (filters.lender       && l.lender_lessor !== filters.lender)                                          return false
    if (filters.customerType && l.customer_type !== filters.customerType)                                    return false
    if (filters.term         && (l.term ?? '').toString().trim() !== filters.term)                           return false
    return true
  }), [leases, filters])

  const allChecked  = filtered.length > 0 && filtered.every((l) => checkedIds.has(l.id))
  const someChecked = filtered.some((l) => checkedIds.has(l.id))

  function toggleAll() {
    if (allChecked) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(filtered.map((l) => l.id)))
    }
  }

  function toggleId(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleExport() {
    const toExport = someChecked
      ? filtered.filter((l) => checkedIds.has(l.id))
      : filtered
    exportToExcel(toExport)
  }

  useEffect(() => { setPage(1) }, [filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

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
          makes={makes}
          companies={companies}
          customerTypes={customerTypes}
          terms={terms}
          lenders={lenders}
        />
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Expired Lease Records</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasFilters ? `${filtered.length} of ${leases.length}` : leases.length} total
              {totalPages > 1 && ` · page ${page} of ${totalPages}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="btn-secondary py-1.5 text-xs"
              disabled={loading || filtered.length === 0}
            >
              <Download size={13} />
              {someChecked ? `Export (${checkedIds.size})` : 'Export'}
            </button>
            <button onClick={onRefresh} className="btn-secondary py-1.5 text-xs" disabled={loading}>
              <RefreshCw size={13} className={clsx(loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
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
            <p className="text-sm font-semibold text-gray-800">No expired lease records</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Run the import script to populate data from Expired Leases.xlsx.
            </p>
          </div>
        )}

        {/* Empty — filters */}
        {!loading && leases.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-sm text-gray-500">No leases match your filters.</p>
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
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
              style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) + 40 }}
              className="border-collapse text-sm"
            >
              <thead>
                <tr className="border-b border-gray-200">
                  {/* Checkbox column */}
                  <th
                    style={{ width: 40, minWidth: 40 }}
                    className="border-r border-gray-200 bg-gray-50 px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                  </th>
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
                    {/* Checkbox */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(lease.id)}
                        onChange={() => toggleId(lease.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                    </td>
                    {/* Details */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <button
                        onClick={() => setSelected(lease)}
                        title="View lease details"
                        className="rounded p-1 text-teal-500 hover:bg-teal-50 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                    {/* Expired Date */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs font-medium text-amber-700">
                      {fmtDate(lease.expired_date)}
                    </td>
                    {/* Company */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="truncate text-gray-800">{lease.company ?? '—'}</div>
                    </td>
                    {/* Customer Name */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="font-medium text-gray-900 truncate">{lease.customer_name ?? '—'}</div>
                    </td>
                    {/* Year / Make / Model */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="truncate text-xs text-gray-700">
                        {[lease.year, lease.make, lease.model].filter(Boolean).join(' ') || '—'}
                      </div>
                    </td>
                    {/* VIN */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <span className="truncate block font-mono text-xs text-gray-600">{lease.vin ?? '—'}</span>
                    </td>
                    {/* Customer Type */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="truncate text-xs text-gray-700">{lease.customer_type ?? '—'}</div>
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

        {/* Pagination */}
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
        <ExpiredLeaseDetailModal lease={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
