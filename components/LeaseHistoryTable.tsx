'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { usePersistedColumns } from '@/lib/usePersistedColumns'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'
import { Eye, X, Search, ChevronLeft, ChevronRight, Download, Columns } from 'lucide-react'
import MultiSelectFilter from '@/components/MultiSelectFilter'
import LeaseDocumentsSection from '@/components/LeaseDocumentsSection'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import { fmtDate, fmtMoney, fmtMoneyOrText, DR, MS } from '@/lib/table-utils'
import OrganizeColumnsModal from '@/components/OrganizeColumnsModal'
import { ColKey, COLUMNS, DEFAULT_COLS_EXPIRED, buildCell, getCellTitle } from '@/lib/portfolio-columns'

const PAGE_SIZE = 100

// ─── Detail modal ─────────────────────────────────────────────────────────────

function LeaseHistoryDetailModal({
  lease, onClose,
}: { lease: LeasePortfolioRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-gray-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{lease.customer_name ?? lease.company_name ?? '—'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {[lease.model_year, lease.make, lease.model].filter(Boolean).join(' ')}
              {lease.vin ? <> &nbsp;·&nbsp; <span className="font-mono">{lease.vin}</span></> : null}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">Archived</span>
            <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={18} /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-1">
          <LeaseDocumentsSection leaseId={lease.id} tableName="pritchard_lease_portfolio" />
          <MS title="Lease">
            <DR label="Expired Date"    value={fmtDate(lease.out_of_service_date)} />
            <DR label="Lease Start"     value={fmtDate(lease.lease_start_date)} />
            <DR label="Lease End"       value={fmtDate(lease.lease_end_date)} />
            <DR label="Term"            value={lease.term != null ? `${lease.term} months` : null} />
            <DR label="NDVR Date"       value={fmtDate(lease.ndvr_date)} />
          </MS>
          <MS title="Customer">
            <DR label="Company"         value={lease.company_name} />
            <DR label="Customer Name"   value={lease.customer_name} />
            <DR label="Customer Type"   value={lease.customer_type} />
            <DR label="Driver"          value={lease.driver} />
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
            <DR label="Year"          value={lease.model_year} />
            <DR label="Make"          value={lease.make} />
            <DR label="Model"         value={lease.model} />
            <DR label="Color"         value={lease.color} />
            <DR label="VIN"           value={lease.vin} />
            <DR label="Odometer"      value={lease.odometer != null ? `${Number(lease.odometer).toLocaleString()} mi` : null} />
            <DR label="Odometer Date" value={fmtDate(lease.odometer_date)} />
            <DR label="Plate #"       value={lease.plate_number} />
          </MS>
          <MS title="Lease Terms">
            <DR label="Annual Miles"       value={lease.annual_miles_limit != null ? Number(lease.annual_miles_limit).toLocaleString() : null} />
            <DR label="Lease End Mile Fee" value={lease.lease_end_mile_fee != null ? `$${lease.lease_end_mile_fee}/mi` : null} />
            <DR label="Title State"        value={lease.title_state} />
            <DR label="Registration Date"  value={lease.registration_date} />
          </MS>
          <MS title="Financials (Customer)">
            <DR label="Net Cap Cost"     value={fmtMoney(lease.net_cap_cost)} />
            <DR label="Monthly Dep."     value={fmtMoney(lease.monthly_depreciation)} />
            <DR label="Monthly Interest" value={fmtMoney(lease.monthly_interest)} />
            <DR label="Monthly Tax"      value={fmtMoneyOrText(lease.monthly_tax)} />
            <DR label="Monthly Payment"  value={fmtMoney(lease.monthly_payment)} />
            <DR label="Residual"         value={fmtMoney(lease.lease_end_residual)} />
          </MS>
          <MS title="Lender / Financing">
            <DR label="Lender"                   value={lease.lender} />
            <DR label="Loan/Lease #"             value={lease.lender_loan_lease_number} />
            <DR label="Liability Start"          value={fmtDate(lease.liability_start_date)} />
            <DR label="Liability End"            value={fmtDate(lease.liability_end_date)} />
            <DR label="Monthly Liability Pmt"    value={fmtMoney(lease.monthly_liability_payment)} />
            <DR label="Funding Amount"           value={fmtMoney(lease.funding_amount)} />
            <DR label="Balloon Payment"          value={fmtMoney(lease.balloon_payment)} />
            <DR label="Monthly Dep. (SL)"        value={fmtMoney(lease.monthly_depreciation_sl)} />
            <DR label="Lender Int. Rate"         value={lease.lender_interest_rate != null ? `${(Number(lease.lender_interest_rate) * 100).toFixed(3)}%` : null} />
          </MS>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Filters ──────────────────────────────────────────────────────────────────

interface Filters { name: string; make: string[]; company: string[]; customerType: string[]; term: string[]; lender: string[] }
const EMPTY_FILTERS: Filters = { name: '', make: [], company: [], customerType: [], term: [], lender: [] }

// ─── Excel export ─────────────────────────────────────────────────────────────

function exportToExcel(records: LeasePortfolioRecord[]) {
  const rows = records.map((l) => ({
    'Expired Date': l.out_of_service_date ?? '', 'Company': l.company_name ?? '', 'Customer Name': l.customer_name ?? '',
    'Customer Type': l.customer_type ?? '', 'Driver': l.driver ?? '',
    'Phone': l.phone ?? '', 'Email': l.email_address ?? '',
    'Billing Address': l.billing_address ?? '', 'Billing City': l.billing_city ?? '',
    'Billing State': l.billing_state ?? '', 'Billing ZIP': l.billing_zip_code ?? '',
    'Year': l.model_year ?? '', 'Make': l.make ?? '', 'Model': l.model ?? '',
    'Color': l.color ?? '', 'VIN': l.vin ?? '', 'Odometer': l.odometer ?? '',
    'Odometer Date': l.odometer_date ?? '', 'Plate #': l.plate_number ?? '',
    'NDVR Date': l.ndvr_date ?? '', 'Lease Start Date': l.lease_start_date ?? '',
    'Lease End Date': l.lease_end_date ?? '', 'Term (months)': l.term ?? '',
    'Annual Miles': l.annual_miles_limit ?? '', 'Lease End Mile Fee': l.lease_end_mile_fee ?? '',
    'Title State': l.title_state ?? '', 'Registration Date': l.registration_date ?? '',
    'Net Cap Cost': l.net_cap_cost ?? '', 'Monthly Depreciation': l.monthly_depreciation ?? '',
    'Monthly Interest': l.monthly_interest ?? '', 'Monthly Tax': l.monthly_tax ?? '',
    'Monthly Payment (Customer)': l.monthly_payment ?? '', 'Residual': l.lease_end_residual ?? '',
    'Lender': l.lender ?? '', 'Loan/Lease #': l.lender_loan_lease_number ?? '',
    'Liability Start': l.liability_start_date ?? '', 'Liability End': l.liability_end_date ?? '',
    'Monthly Liability Pmt': l.monthly_liability_payment ?? '', 'Funding Amount': l.funding_amount ?? '',
    'Balloon Payment': l.balloon_payment ?? '', 'Monthly Dep. (SL)': l.monthly_depreciation_sl ?? '',
    'Lender Interest Rate %': l.lender_interest_rate ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Lease History')
  XLSX.writeFile(wb, `lease-history-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TableProps { leases: LeasePortfolioRecord[]; loading: boolean }

export default function LeaseHistoryTable({ leases, loading }: TableProps) {
  const [selected, setSelected]           = useState<LeasePortfolioRecord | null>(null)
  const [filters, setFilters]             = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage]                   = useState(1)
  const [visibleCols, setVisibleCols]     = usePersistedColumns('leaseHistoryCols', DEFAULT_COLS_EXPIRED)
  const [columnsModalOpen, setColumnsModalOpen] = useState(false)

  const makes         = useMemo(() => Array.from(new Set(leases.map((l) => l.make).filter((x): x is string => x !== null))).sort(), [leases])
  const companies     = useMemo(() => Array.from(new Set(leases.map((l) => l.company_name).filter((x): x is string => x !== null))).sort(), [leases])
  const customerTypes = useMemo(() => Array.from(new Set(leases.map((l) => l.customer_type).filter((x): x is string => x !== null))).sort(), [leases])
  const lenders       = useMemo(() => Array.from(new Set(leases.map((l) => l.lender).filter((x): x is string => x !== null))).sort(), [leases])
  const terms         = useMemo(() =>
    Array.from(new Set(leases.map((l) => (l.term ?? '').toString().trim()).filter(Boolean))).sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b)
      return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb
    }), [leases])

  const filtered = useMemo(() => leases.filter((l) => {
    if (filters.name                    && !(l.customer_name ?? '').toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.company.length > 0      && !filters.company.includes(l.company_name ?? ''))          return false
    if (filters.make.length > 0         && !filters.make.includes(l.make ?? ''))                     return false
    if (filters.lender.length > 0       && !filters.lender.includes(l.lender ?? ''))                 return false
    if (filters.customerType.length > 0 && !filters.customerType.includes(l.customer_type ?? ''))    return false
    if (filters.term.length > 0         && !filters.term.includes((l.term ?? '').toString().trim()))  return false
    return true
  }), [leases, filters])

  function handleExport() { exportToExcel(filtered) }

  useEffect(() => { setPage(1) }, [filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  const pageNumbers = useMemo((): (number | string)[] => {
    const visible = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    const result: (number | string)[] = []
    visible.forEach((p, idx) => { if (idx > 0 && p - (visible[idx - 1]) > 1) result.push('…'); result.push(p) })
    return result
  }, [totalPages, page])

  const hasFilters = !!filters.name || filters.make.length > 0 || filters.company.length > 0 || filters.customerType.length > 0 || filters.term.length > 0 || filters.lender.length > 0

  const visibleDefs = visibleCols.map((k) => COLUMNS.find((c) => c.key === k)!).filter(Boolean)
  const tableWidth  = 70 + visibleDefs.reduce((acc, col) => acc + col.width, 0)

  return (
    <div className="flex flex-col gap-4">
      {!loading && leases.length > 0 && (
        <div className="flex flex-wrap gap-[17px] items-center">
          <MultiSelectFilter label="Company"       selected={filters.company}      onChange={(v) => setFilters((f) => ({ ...f, company: v }))}      options={companies} />
          <MultiSelectFilter label="Make"          selected={filters.make}         onChange={(v) => setFilters((f) => ({ ...f, make: v }))}         options={makes} />
          <MultiSelectFilter label="Customer Type" selected={filters.customerType} onChange={(v) => setFilters((f) => ({ ...f, customerType: v }))} options={customerTypes} />
          <MultiSelectFilter label="Term"          selected={filters.term}         onChange={(v) => setFilters((f) => ({ ...f, term: v }))}         options={terms} />
          <MultiSelectFilter label="Lender"        selected={filters.lender}       onChange={(v) => setFilters((f) => ({ ...f, lender: v }))}       options={lenders} />
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer, company, VIN…"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              className="input pl-7 py-1.5 text-sm w-[28rem]"
            />
            {filters.name && (
              <button onClick={() => setFilters({ ...filters, name: '' })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          {hasFilters && (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-400 transition-colors">
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3.5">
          <div className="mr-auto">
            <h2 className="text-sm font-semibold text-gray-900">Archived Lease Records</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasFilters ? `${filtered.length} of ${leases.length}` : leases.length} total
              {totalPages > 1 && ` · page ${page} of ${totalPages}`}
            </p>
          </div>
          <button onClick={() => setColumnsModalOpen(true)} className="btn-secondary py-1.5 text-xs flex items-center gap-1.5">
            <Columns size={13} /> Columns
          </button>
          <button onClick={handleExport} className="btn-secondary py-1.5 text-xs flex items-center gap-1.5" disabled={loading || filtered.length === 0}>
            <Download size={13} /> Export
          </button>
        </div>

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

        {!loading && leases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-semibold text-gray-800">No archived lease records</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">Records appear here automatically when an expired lease is superseded by a new active lease.</p>
          </div>
        )}

        {!loading && leases.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-sm text-gray-500">No records match your filters.</p>
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="mt-2 text-xs text-brand-600 hover:underline">Clear filters</button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            <table style={{ tableLayout: 'fixed', minWidth: tableWidth }} className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10" style={{ boxShadow: '0 1px 0 #e5e7eb' }}>
                <tr>
                  <th style={{ width: 70, minWidth: 70 }} className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-900">Details</th>
                  {visibleDefs.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      title={col.tooltip}
                      className={clsx(
                        'border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900',
                        col.tooltip && 'cursor-help'
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50 transition-colors">
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <button onClick={() => setSelected(lease)} title="View lease details" className="rounded p-1 text-teal-500 hover:bg-teal-50 transition-colors">
                        <Eye size={16} />
                      </button>
                    </td>
                    {visibleDefs.map((col) => (
                      <td key={col.key} className="border-r border-gray-100 px-3 py-2.5 overflow-hidden" title={getCellTitle(col.key, lease)}>
                        {buildCell(col.key, lease)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={13} /> Prev
              </button>
              {pageNumbers.map((p, i) =>
                typeof p === 'string' ? <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span> : (
                  <button key={p} onClick={() => setPage(p)} className={clsx('min-w-[28px] rounded px-2 py-1 text-xs font-medium', page === p ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>{p}</button>
                )
              )}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ChevronRight size={13} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
            </div>
          </div>
        )}
      </div>

      {selected && <LeaseHistoryDetailModal lease={selected} onClose={() => setSelected(null)} />}

      {columnsModalOpen && (
        <OrganizeColumnsModal
          allColumns={COLUMNS}
          defaultCols={DEFAULT_COLS_EXPIRED}
          visible={visibleCols}
          onApply={(cols) => setVisibleCols(cols as ColKey[])}
          onClose={() => setColumnsModalOpen(false)}
        />
      )}
    </div>
  )
}
