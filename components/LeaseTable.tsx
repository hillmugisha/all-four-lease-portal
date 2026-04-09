'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { LeaseRecord } from '@/lib/types'
import { fmt, fmtDate } from '@/lib/calculations'
import { FileDown, RefreshCw, Plus, Eye, X, Search, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<LeaseRecord['doc_status'], string> = {
  draft:     'bg-gray-100 text-gray-600',
  generated: 'bg-blue-50 text-blue-700',
  sent:      'bg-amber-50 text-amber-700',
  signed:    'bg-green-50 text-green-700',
}
const STATUS_LABELS: Record<LeaseRecord['doc_status'], string> = {
  draft: 'Draft', generated: 'Generated', sent: 'Sent', signed: 'Signed',
}

function StatusBadge({ status }: { status: LeaseRecord['doc_status'] }) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
      STATUS_STYLES[status]
    )}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── PDF download ─────────────────────────────────────────────────────────────

async function downloadPdf(record: LeaseRecord) {
  const res = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record }),
  })
  if (!res.ok) { alert('PDF generation failed'); return }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `lease-${record.lessee_name.replace(/\s+/g, '-')}-${record.vehicle_vin}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500 shrink-0 mr-4">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value ?? '—'}</span>
    </div>
  )
}

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{title}</h3>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-1 mb-4">{children}</div>
    </div>
  )
}

function LeaseDetailModal({ lease, onClose }: { lease: LeaseRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-gray-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{lease.lessee_name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {lease.vehicle_year} {lease.vehicle_make} {lease.vehicle_model} &nbsp;·&nbsp;
              <span className="font-mono">{lease.vehicle_vin}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <StatusBadge status={lease.doc_status} />
            <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-1">
          <ModalSection title="Lessor">
            <DetailRow label="Name"            value={lease.lessor_name} />
            <DetailRow label="Address"         value={lease.lessor_address} />
            {lease.lessor_po_box && <DetailRow label="P.O. Box" value={lease.lessor_po_box} />}
            <DetailRow label="City / State / ZIP" value={`${lease.lessor_city}, ${lease.lessor_state} ${lease.lessor_zip}`} />
          </ModalSection>
          <ModalSection title="Lessee">
            <DetailRow label="Name"    value={lease.lessee_name} />
            <DetailRow label="Address" value={lease.lessee_address} />
            <DetailRow label="City / State / ZIP" value={`${lease.lessee_city}, ${lease.lessee_state} ${lease.lessee_zip}`} />
            <DetailRow label="Phone"   value={lease.lessee_phone} />
            <DetailRow label="Email"   value={lease.lessee_email} />
          </ModalSection>
          <ModalSection title="Vehicle">
            <DetailRow label="Condition"  value={lease.vehicle_condition} />
            <DetailRow label="Year"       value={lease.vehicle_year} />
            <DetailRow label="Make"       value={lease.vehicle_make} />
            <DetailRow label="Model"      value={lease.vehicle_model} />
            <DetailRow label="Body Style" value={lease.vehicle_body_style} />
            <DetailRow label="VIN"        value={lease.vehicle_vin} />
            <DetailRow label="Odometer"   value={lease.vehicle_odometer ? `${lease.vehicle_odometer} mi` : null} />
          </ModalSection>
          <ModalSection title="Lease Terms">
            <DetailRow label="Lease Date"    value={fmtDate(lease.lease_date)} />
            <DetailRow label="Term"          value={`${lease.num_payments} months`} />
            <DetailRow label="First Payment" value={fmtDate(lease.first_payment_date)} />
            <DetailRow label="Miles / Year"  value={`${Number(lease.miles_per_year).toLocaleString()} mi`} />
            <DetailRow label="Excess Rate"   value={`$${Number(lease.excess_mileage_rate).toFixed(2)} / mi`} />
          </ModalSection>
          <ModalSection title="Gross Capitalized Cost">
            <DetailRow label="Vehicle Agreed Value" value={fmt(lease.vehicle_agreed_value)} />
            <DetailRow label="Taxes"                value={fmt(lease.taxes)} />
            <DetailRow label="Title & Reg Fees"     value={fmt(lease.title_reg_fees)} />
            <DetailRow label="Acquisition Fee"      value={fmt(lease.acquisition_fee)} />
            <DetailRow label="Documentation Fee"    value={fmt(lease.doc_fee)} />
            <DetailRow label="Prior Lease Balance"  value={fmt(lease.prior_lease_balance)} />
            <DetailRow label="Optional Products"    value={fmt(lease.optional_products)} />
            <DetailRow label="Gross Cap Cost"       value={lease.gross_cap_cost ? fmt(lease.gross_cap_cost) : null} />
          </ModalSection>
          <ModalSection title="Deal Economics">
            <DetailRow label="Cap Cost Reduction"     value={fmt(lease.cap_cost_reduction)} />
            <DetailRow label="Net Trade-In Allowance" value={lease.net_tradein_allowance ? fmt(lease.net_tradein_allowance) : null} />
            <DetailRow label="Adjusted Cap Cost"      value={lease.adjusted_cap_cost ? fmt(lease.adjusted_cap_cost) : null} />
            <DetailRow label="Residual Value"         value={fmt(lease.residual_value)} />
            <DetailRow label="Depreciation"           value={lease.depreciation ? fmt(lease.depreciation) : null} />
            <DetailRow label="Rent Charge"            value={fmt(lease.rent_charge)} />
            <DetailRow label="Base Monthly Payment"   value={lease.base_monthly_payment ? fmt(lease.base_monthly_payment) : null} />
            <DetailRow label="Monthly Sales Tax"      value={fmt(lease.monthly_sales_tax)} />
            <DetailRow label="Total Monthly Payment"  value={lease.total_monthly_payment ? fmt(lease.total_monthly_payment) : null} />
            <DetailRow label="Total of Payments"      value={lease.total_of_payments ? fmt(lease.total_of_payments) : null} />
            <DetailRow label="Amount Due at Signing"  value={fmt(lease.amount_due_at_signing)} />
          </ModalSection>
          <ModalSection title="Fees">
            <DetailRow label="Disposition Fee"       value={fmt(lease.disposition_fee)} />
            <DetailRow label="Early Termination Fee" value={fmt(lease.early_termination_fee)} />
            <DetailRow label="Purchase Option Fee"   value={fmt(lease.purchase_option_fee)} />
            <DetailRow label="Official Fees & Taxes" value={lease.official_fees_taxes ? fmt(lease.official_fees_taxes) : null} />
          </ModalSection>
          {lease.tradein_make && (
            <ModalSection title="Trade-In">
              <DetailRow label="Vehicle"         value={`${lease.tradein_year ?? ''} ${lease.tradein_make ?? ''} ${lease.tradein_model ?? ''}`.trim()} />
              <DetailRow label="Gross Allowance" value={fmt(lease.tradein_gross_allowance)} />
              <DetailRow label="Prior Balance"   value={fmt(lease.tradein_prior_balance)} />
              <DetailRow label="Net Allowance"   value={lease.net_tradein_allowance ? fmt(lease.net_tradein_allowance) : null} />
            </ModalSection>
          )}
          <ModalSection title="Record">
            <DetailRow label="Created"      value={new Date(lease.created_at).toLocaleString()} />
            <DetailRow label="Updated"      value={new Date(lease.updated_at).toLocaleString()} />
            <DetailRow label="Doc Status" value={STATUS_LABELS[lease.doc_status]} />
            {lease.signed_at && <DetailRow label="Signed At" value={new Date(lease.signed_at).toLocaleString()} />}
          </ModalSection>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 rounded-b-xl flex justify-between items-center">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={() => downloadPdf(lease)} className="btn-primary">
            <FileDown size={14} />
            Download PDF
          </button>
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
      {/* Resize handle */}
      <span
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-400 transition-colors"
        style={{ touchAction: 'none' }}
      />
    </th>
  )
}

// ─── Filters bar ──────────────────────────────────────────────────────────────

interface Filters {
  name:   string
  status: string
  year:   string
  make:   string
  model:  string
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
  filters, onChange, statuses, years, makes, models,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  statuses: string[]
  years: string[]
  makes: string[]
  models: string[]
}) {
  function set(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  const hasAny = Object.values(filters).some(Boolean)

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {/* Customer name — text search (too many unique values for a dropdown) */}
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
        label="Doc Status"
        value={filters.status}
        onChange={(v) => set('status', v)}
        options={statuses.map((s) => STATUS_LABELS[s as LeaseRecord['doc_status']] ? s : s)}
        placeholder="All statuses"
      />

      <FilterSelect
        label="Year"
        value={filters.year}
        onChange={(v) => set('year', v)}
        options={years}
        placeholder="All years"
      />

      <FilterSelect
        label="Make"
        value={filters.make}
        onChange={(v) => set('make', v)}
        options={makes}
        placeholder="All makes"
      />

      <FilterSelect
        label="Model"
        value={filters.model}
        onChange={(v) => set('model', v)}
        options={models}
        placeholder="All models"
      />

      {hasAny && (
        <div className="self-end">
          <button
            onClick={() => onChange({ name: '', status: '', year: '', make: '', model: '' })}
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
  'Details', 'Customer Name', 'Email', 'Vehicle', 'VIN',
  'Lease Date', 'Lease Start', 'Lease End',
  'Monthly Payment', 'Lease Term', 'Total', 'Doc Status', 'Lease Agreement Docs',
]
const DEFAULT_WIDTHS = [80, 190, 190, 190, 150, 110, 110, 110, 140, 90, 130, 120, 170]

// Calculate lease end date: first_payment_date + (num_payments - 1) months
function leaseEndDate(firstPayment: string, numPayments: number): string {
  if (!firstPayment) return '—'
  const [y, m, d] = firstPayment.split('-').map(Number)
  const end = new Date(y, m - 1 + (numPayments - 1), d)
  return end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LeaseTable() {
  const [leases, setLeases]       = useState<LeaseRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<LeaseRecord | null>(null)
  const [filters, setFilters]     = useState<Filters>({ name: '', status: '', year: '', make: '', model: '' })
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_WIDTHS)

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/leases')
      if (!res.ok) { setLeases([]); return }
      const text = await res.text()
      if (!text)   { setLeases([]); return }
      setLeases(JSON.parse(text))
    } catch {
      setLeases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Unique sorted years and makes from loaded data
  const statuses = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.doc_status).filter(Boolean))).sort(),
    [leases]
  )
  const years = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.vehicle_year).filter(Boolean))).sort().reverse(),
    [leases]
  )
  const makes = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.vehicle_make).filter(Boolean))).sort(),
    [leases]
  )
  const models = useMemo(() =>
    Array.from(new Set(leases.map((l) => l.vehicle_model).filter(Boolean))).sort(),
    [leases]
  )

  // Client-side filtering
  const filtered = useMemo(() => leases.filter((l) => {
    if (filters.name   && !l.lessee_name.toLowerCase().includes(filters.name.toLowerCase()))    return false
    if (filters.status && l.doc_status !== filters.status)                                           return false
    if (filters.year   && l.vehicle_year !== filters.year)                                       return false
    if (filters.make   && l.vehicle_make !== filters.make)                                       return false
    if (filters.model  && !l.vehicle_model.toLowerCase().includes(filters.model.toLowerCase())) return false
    return true
  }), [leases, filters])

  const hasFilters = Object.values(filters).some(Boolean)

  function resizeCol(i: number, delta: number) {
    setColWidths((prev) => prev.map((w, idx) => idx === i ? Math.max(60, w + delta) : w))
  }

  return (
    <>
      {/* ── Filters above the table ── */}
      {!loading && leases.length > 0 && (
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          statuses={statuses}
          years={years}
          makes={makes}
          models={models}
        />
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Lease Records</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasFilters ? `${filtered.length} of ${leases.length}` : leases.length} total
            </p>
          </div>
          <button onClick={load} className="btn-secondary py-1.5 text-xs" disabled={loading}>
            <RefreshCw size={13} className={clsx(loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
                <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {/* Empty — no records */}
        {!loading && leases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 mb-4">
              <FileDown size={26} className="text-brand-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800">No leases yet</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Create your first lease agreement to see records appear here.
            </p>
            <Link href="/new-lease" className="btn-primary mt-6">
              <Plus size={15} />
              Create New Lease
            </Link>
          </div>
        )}

        {/* Empty — filters */}
        {!loading && leases.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-sm text-gray-500">No leases match your filters.</p>
            <button
              onClick={() => setFilters({ name: '', status: '', year: '', make: '', model: '' })}
              className="mt-2 text-xs text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Resizable table */}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table
              style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) }}
              className="border-collapse text-sm"
            >
              <thead>
                <tr className="border-b border-gray-200">
                  {COL_HEADERS.map((h, i) => (
                    <ResizableTh
                      key={h}
                      width={colWidths[i]}
                      onResize={(d) => resizeCol(i, d)}
                    >
                      {h}
                    </ResizableTh>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50 transition-colors">
                    {/* Details — first column */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <button
                        onClick={() => setSelected(lease)}
                        className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <Eye size={11} />
                        View
                      </button>
                    </td>
                    {/* Customer Name */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <div className="font-medium text-gray-900 truncate">{lease.lessee_name}</div>
                    </td>
                    {/* Email */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <span className="text-xs text-gray-600 truncate block">{lease.lessee_email}</span>
                    </td>
                    {/* Vehicle */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <span className="truncate block text-gray-800">
                        {lease.vehicle_year} {lease.vehicle_make} {lease.vehicle_model}
                      </span>
                    </td>
                    {/* VIN */}
                    <td className="border-r border-gray-100 px-3 py-2.5 overflow-hidden">
                      <span className="font-mono text-xs text-gray-600 truncate block">{lease.vehicle_vin}</span>
                    </td>
                    {/* Lease Date (signing date) */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                      {fmtDate(lease.lease_date)}
                    </td>
                    {/* Lease Start (first payment date) */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                      {lease.first_payment_date ? fmtDate(lease.first_payment_date) : '—'}
                    </td>
                    {/* Lease End (calculated) */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                      {lease.first_payment_date && lease.num_payments
                        ? leaseEndDate(lease.first_payment_date, lease.num_payments)
                        : '—'}
                    </td>
                    {/* Monthly Payment */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap font-medium text-gray-900">
                      {lease.total_monthly_payment ? fmt(lease.total_monthly_payment) : '—'}
                    </td>
                    {/* Lease Term */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                      {lease.num_payments} mo.
                    </td>
                    {/* Total */}
                    <td className="border-r border-gray-100 px-3 py-2.5 whitespace-nowrap text-gray-600">
                      {lease.total_of_payments ? fmt(lease.total_of_payments) : '—'}
                    </td>
                    {/* Doc Status */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <StatusBadge status={lease.doc_status} />
                    </td>
                    {/* Lease Agreement Docs */}
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => downloadPdf(lease)}
                        className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                        title="Download lease agreement PDF"
                      >
                        <FileDown size={11} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <LeaseDetailModal lease={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
