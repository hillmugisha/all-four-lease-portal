'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { usePersistedColumns } from '@/lib/usePersistedColumns'
import { LeaseRecord } from '@/lib/types'
import { fmt, fmtDate } from '@/lib/calculations'
import { FileDown, Columns, Plus, Eye, X, Search, ChevronDown, Trash2, AlertTriangle, Zap, Loader2, CheckCircle2, Pencil } from 'lucide-react'
import LeaseDocumentsSection from '@/components/LeaseDocumentsSection'
import clsx from 'clsx'
import { PdfViewerModal } from '@/components/PdfViewerModal'
import { DR as DetailRow, MS as ModalSection } from '@/lib/table-utils'
import LeaseForm from '@/components/LeaseForm'
import OrganizeColumnsModal from '@/components/OrganizeColumnsModal'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<LeaseRecord['doc_status'], string> = {
  draft:           'bg-gray-100 text-gray-500',
  generated:       'bg-blue-50 text-blue-700',
  sent:            'bg-amber-50 text-amber-700',
  customer_signed: 'bg-purple-50 text-purple-700',
  completed:       'bg-green-50 text-green-700',
}
const STATUS_LABELS: Record<LeaseRecord['doc_status'], string> = {
  draft:           'Draft',
  generated:       'Generated',
  sent:            'Sent for Signatures',
  customer_signed: 'Customer Signed',
  completed:       'Completed',
}

function StatusBadge({ status }: { status: LeaseRecord['doc_status'] }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span className={clsx(
      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap',
      style
    )}>
      {label}
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

function LeaseDetailModal({ lease, onClose }: { lease: LeaseRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-gray-50 shadow-2xl">
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
          <LeaseDocumentsSection leaseId={lease.id} tableName="leases" />
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

// ─── Bulk Delete Confirm Modal ────────────────────────────────────────────────

function BulkDeleteConfirmModal({
  leases,
  onConfirm,
  onCancel,
  deleting,
}: {
  leases:    LeaseRecord[]
  onConfirm: () => void
  onCancel:  () => void
  deleting:  boolean
}) {
  const toDelete  = leases.filter((l) => l.doc_status !== 'completed')
  const protected_ = leases.filter((l) => l.doc_status === 'completed')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Delete Leases</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {leases.length} lease{leases.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[52vh] overflow-y-auto px-5 py-4 space-y-4">
          {toDelete.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">
                {toDelete.length} lease{toDelete.length !== 1 ? 's' : ''} will be permanently deleted:
              </p>
              <div className="space-y-1.5">
                {toDelete.map((l) => (
                  <div key={l.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-sm font-semibold text-gray-900">{l.lessee_name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {[l.vehicle_year, l.vehicle_make, l.vehicle_model].filter(Boolean).join(' ')}
                      {l.vehicle_vin && <> · <span className="font-mono">{l.vehicle_vin}</span></>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {protected_.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">
                {protected_.length} completed lease{protected_.length !== 1 ? 's' : ''} will be skipped:
              </p>
              <div className="space-y-1.5">
                {protected_.map((l) => (
                  <div key={l.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-700">{l.lessee_name}</p>
                      <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
                        Completed
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {[l.vehicle_year, l.vehicle_make, l.vehicle_model].filter(Boolean).join(' ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {toDelete.length > 0 && (
            <p className="text-sm font-medium text-red-600">This action cannot be undone.</p>
          )}

          {toDelete.length === 0 && (
            <p className="text-sm text-gray-500">
              All selected leases have <strong>Completed</strong> status and cannot be deleted.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-3">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={deleting || toDelete.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? (
              <><Loader2 size={14} className="animate-spin" /> Deleting…</>
            ) : (
              <><Trash2 size={14} /> Delete {toDelete.length > 0 ? toDelete.length : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  lease,
  onConfirm,
  onCancel,
  deleting,
}: {
  lease: LeaseRecord
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  const filename = `lease-${lease.lessee_name.replace(/\s+/g, '-')}-${lease.vehicle_vin}.pdf`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900">Delete Document</h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">Are you sure you want to delete this document?</p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Lease Agreement</p>
            <p className="mt-0.5 text-xs text-gray-500">File: {filename}</p>
          </div>
          <p className="text-sm font-medium text-red-600">This action cannot be undone.</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-3">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? 'Deleting…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Activate Confirm Modal ───────────────────────────────────────────────────

function ActivateConfirmModal({
  leases,
  onConfirm,
  onCancel,
  activating,
}: {
  leases:     LeaseRecord[]
  onConfirm:  () => void
  onCancel:   () => void
  activating: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Zap size={18} className="shrink-0 text-green-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Activate Leases</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {leases.length} lease{leases.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[52vh] overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            The following leases will be moved to <strong>Current Leases</strong> and marked active.
          </p>

          <div className="space-y-2">
            {leases.map((l) => (
              <div key={l.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{l.lessee_name}</p>
                  <span className="shrink-0 text-sm font-medium text-gray-900">
                    {l.total_monthly_payment ? fmt(l.total_monthly_payment) : '—'}<span className="text-xs text-gray-400">/mo</span>
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  {[l.vehicle_year, l.vehicle_make, l.vehicle_model].filter(Boolean).join(' ')}
                  {l.vehicle_vin && (
                    <> &nbsp;·&nbsp; <span className="font-mono">{l.vehicle_vin}</span></>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {l.first_payment_date ? fmtDate(l.first_payment_date) : '—'}
                  {' → '}
                  {l.first_payment_date && l.num_payments
                    ? leaseEndDate(l.first_payment_date, l.num_payments)
                    : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-3">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={activating}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {activating ? (
              <><Loader2 size={14} className="animate-spin" /> Activating…</>
            ) : (
              <><Zap size={14} /> Activate</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState { message: string; type: 'success' | 'error' }

function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className={clsx(
      'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5',
      'rounded-lg px-5 py-3 text-sm font-medium shadow-lg pointer-events-none',
      toast.type === 'success'
        ? 'bg-green-600 text-white'
        : 'bg-red-600 text-white',
    )}>
      {toast.type === 'success'
        ? <CheckCircle2 size={16} />
        : <AlertTriangle size={16} />}
      {toast.message}
    </div>
  )
}

// ─── Column definitions ───────────────────────────────────────────────────────

type ColKey =
  | 'lessee_name' | 'lessee_email' | 'vehicle' | 'vehicle_vin'
  | 'lease_date' | 'first_payment_date' | 'lease_end'
  | 'total_monthly_payment' | 'num_payments' | 'total_of_payments'
  | 'doc_status' | 'created_at' | 'updated_at'

interface ColDef { key: ColKey; label: string; default: boolean; width: number }

const COLUMNS: ColDef[] = [
  { key: 'lessee_name',           label: 'Customer Name',   default: true,  width: 190 },
  { key: 'lessee_email',          label: 'Email',           default: true,  width: 190 },
  { key: 'vehicle',               label: 'Vehicle',         default: true,  width: 190 },
  { key: 'vehicle_vin',           label: 'VIN',             default: true,  width: 150 },
  { key: 'lease_date',            label: 'Lease Date',      default: true,  width: 110 },
  { key: 'first_payment_date',    label: 'Lease Start',     default: true,  width: 110 },
  { key: 'lease_end',             label: 'Lease End',       default: true,  width: 110 },
  { key: 'total_monthly_payment', label: 'Monthly Payment', default: true,  width: 140 },
  { key: 'num_payments',          label: 'Lease Term',      default: true,  width: 90  },
  { key: 'total_of_payments',     label: 'Total',           default: true,  width: 130 },
  { key: 'doc_status',            label: 'Doc Status',      default: true,  width: 120 },
  { key: 'created_at',            label: 'Created Date',    default: false, width: 130 },
  { key: 'updated_at',            label: 'Last Updated',    default: false, width: 130 },
]

const DEFAULT_COLS: ColKey[] = COLUMNS.filter((c) => c.default).map((c) => c.key)

function getCellTitle(col: ColKey, lease: LeaseRecord): string | undefined {
  switch (col) {
    case 'lessee_name':  return lease.lessee_name ?? undefined
    case 'lessee_email': return lease.lessee_email ?? undefined
    case 'vehicle':      return [lease.vehicle_year, lease.vehicle_make, lease.vehicle_model].filter(Boolean).join(' ') || undefined
    case 'vehicle_vin':  return lease.vehicle_vin ?? undefined
    default:             return undefined
  }
}

// ─── Filters ─────────────────────────────────────────────────────────────────

interface Filters { search: string; status: string; year: string; make: string; model: string }
const EMPTY_FILTERS: Filters = { search: '', status: '', year: '', make: '', model: '' }

// Calculate lease end date: first_payment_date + (num_payments - 1) months
function leaseEndDate(firstPayment: string, numPayments: number): string {
  if (!firstPayment) return '—'
  const [y, m, d] = firstPayment.split('-').map(Number)
  const end = new Date(y, m - 1 + (numPayments - 1), d)
  return end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Cell renderer ────────────────────────────────────────────────────────────

function renderCell(col: ColKey, lease: LeaseRecord): React.ReactNode {
  switch (col) {
    case 'lessee_name':
      return <div className="font-medium text-gray-900 truncate">{lease.lessee_name}</div>
    case 'lessee_email':
      return <span className="text-xs text-gray-600 truncate block">{lease.lessee_email}</span>
    case 'vehicle':
      return <span className="truncate block text-gray-800">{[lease.vehicle_year, lease.vehicle_make, lease.vehicle_model].filter(Boolean).join(' ')}</span>
    case 'vehicle_vin':
      return <span className="font-mono text-xs text-gray-600 truncate block">{lease.vehicle_vin}</span>
    case 'lease_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.lease_date)}</span>
    case 'first_payment_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{lease.first_payment_date ? fmtDate(lease.first_payment_date) : '—'}</span>
    case 'lease_end':
      return <span className="whitespace-nowrap text-xs text-gray-600">{lease.first_payment_date && lease.num_payments ? leaseEndDate(lease.first_payment_date, lease.num_payments) : '—'}</span>
    case 'total_monthly_payment':
      return <span className="whitespace-nowrap font-medium text-gray-900">{lease.total_monthly_payment ? fmt(lease.total_monthly_payment) : '—'}</span>
    case 'num_payments':
      return <span className="whitespace-nowrap text-xs text-gray-600">{lease.num_payments} mo.</span>
    case 'total_of_payments':
      return <span className="whitespace-nowrap text-gray-600">{lease.total_of_payments ? fmt(lease.total_of_payments) : '—'}</span>
    case 'doc_status':
      return <StatusBadge status={lease.doc_status} />
    case 'created_at':
      return <span className="whitespace-nowrap text-xs text-gray-600">{lease.created_at ? fmtDate(lease.created_at.slice(0, 10)) : '—'}</span>
    case 'updated_at': {
      const dt = lease.updated_at ?? lease.created_at
      return <span className="whitespace-nowrap text-xs text-gray-600">{dt ? fmtDate(dt.slice(0, 10)) : '—'}</span>
    }
    default:
      return null
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LeaseTableProps {
  onCreateNew?: () => void
}

export default function LeaseTable({ onCreateNew }: LeaseTableProps = {}) {
  const [leases, setLeases]           = useState<LeaseRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<LeaseRecord | null>(null)
  const [viewingPdf, setViewingPdf]   = useState<LeaseRecord | null>(null)
  const [editingLease, setEditingLease] = useState<LeaseRecord | null>(null)
  const [deletingLease, setDeletingLease] = useState<LeaseRecord | null>(null)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [filters, setFilters]         = useState<Filters>(EMPTY_FILTERS)
  const [visibleCols, setVisibleCols] = usePersistedColumns('cols:new-leases', DEFAULT_COLS)
  const [columnsModalOpen, setColumnsModalOpen] = useState(false)

  // Bulk-activate state
  const [checkedIds, setCheckedIds]             = useState<Set<string>>(new Set())
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [activating, setActivating]             = useState(false)
  const [toast, setToast]                       = useState<ToastState | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/leases')
      if (!res.ok) { setLeases([]); return }
      const text = await res.text()
      if (!text)   { setLeases([]); return }
      const data: LeaseRecord[] = JSON.parse(text)
      setLeases(data)

      // Background-sync any envelope that isn't marked completed yet.
      // This ensures the table always reflects the true DocuSign state on
      // load without requiring the user to open the PDF viewer first.
      const toSync = data.filter(
        (l) => l.docusign_envelope_id && l.doc_status !== 'completed'
      )
      toSync.forEach((l) => {
        fetch(`/api/leases/${l.id}/envelope-status`)
          .then((r) => (r.ok ? r.json() : null))
          .then((result) => {
            if (!result?.doc_status || result.doc_status === l.doc_status) return
            // Patch just this row in local state — no full reload needed
            setLeases((prev) => prev.map((x) =>
              x.id === l.id
                ? {
                    ...x,
                    doc_status: result.doc_status,
                    ...(result.doc_status === 'completed'
                      ? { signed_at: new Date().toISOString() }
                      : {}),
                  }
                : x
            ))
          })
          .catch(() => { /* silent — stale status is better than a crash */ })
      })
    } catch {
      setLeases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function confirmDelete() {
    if (!deletingLease) return
    setDeleteInProgress(true)
    try {
      const res = await fetch(`/api/leases/${deletingLease.id}`, { method: 'DELETE' })
      if (res.ok) {
        setLeases((prev) => prev.filter((l) => l.id !== deletingLease.id))
        setDeletingLease(null)
      } else {
        alert('Failed to delete lease. Please try again.')
      }
    } catch {
      alert('Failed to delete lease. Please try again.')
    } finally {
      setDeleteInProgress(false)
    }
  }

  // Called by PdfViewerModal when DocuSign reports a status change
  const handleStatusChange = useCallback((leaseId: string, newStatus: LeaseRecord['doc_status']) => {
    setLeases((prev) => prev.map((l) =>
      l.id === leaseId
        ? { ...l, doc_status: newStatus, ...(newStatus === 'completed' ? { signed_at: new Date().toISOString() } : {}) }
        : l
    ))
    // Keep the viewingPdf record in sync so the badge re-renders correctly
    setViewingPdf((prev) =>
      prev?.id === leaseId ? { ...prev, doc_status: newStatus } : prev
    )
  }, [])

  // ── Checkbox helpers ───────────────────────────────────────────────────────
  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Toast ───────────────────────────────────────────────────────────────────
  function fireToast(message: string, type: ToastState['type']) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Activate ────────────────────────────────────────────────────────────────
  async function confirmActivate() {
    setActivating(true)
    try {
      const res = await fetch('/api/leases/activate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: Array.from(checkedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Activation failed')

      // Remove activated leases from the New Leases table immediately
      const activated = new Set(checkedIds)
      setLeases((prev) => prev.filter((l) => !activated.has(l.id)))
      setCheckedIds(new Set())
      setShowActivateModal(false)
      fireToast(
        `${data.activated} lease${data.activated !== 1 ? 's' : ''} activated`,
        'success',
      )

      // Notify the Current Leases page (same window or other tabs) to reload
      try {
        new BroadcastChannel('lease-updates').postMessage({ type: 'lease-activated' })
      } catch { /* BroadcastChannel not supported — silent */ }
    } catch (e) {
      setShowActivateModal(false)
      fireToast(String(e), 'error')
    } finally {
      setActivating(false)
    }
  }

  // All checked leases (regardless of status)
  const selectedLeases = useMemo(
    () => leases.filter((l) => checkedIds.has(l.id)),
    [leases, checkedIds],
  )

  // Activate is only meaningful for completed-but-not-yet-active leases
  const hasActivatable = useMemo(
    () => selectedLeases.some((l) => l.doc_status === 'completed' && !l.is_active),
    [selectedLeases],
  )

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
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = [l.lessee_name, l.lessee_email, l.vehicle_vin, l.vehicle_year, l.vehicle_make, l.vehicle_model].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (filters.status && l.doc_status !== filters.status) return false
    if (filters.year   && l.vehicle_year !== filters.year) return false
    if (filters.make   && l.vehicle_make !== filters.make) return false
    if (filters.model  && !l.vehicle_model.toLowerCase().includes(filters.model.toLowerCase())) return false
    return true
  }), [leases, filters])

  const hasFilters = Object.values(filters).some(Boolean)

  // Ordered visible column definitions
  const visibleDefs = visibleCols.map((k) => COLUMNS.find((c) => c.key === k)!).filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-[17px] items-center">
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="input py-1.5 text-sm appearance-none pr-7"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s as LeaseRecord['doc_status']] ?? s}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))} className="input py-1.5 text-sm appearance-none pr-7">
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select value={filters.make} onChange={(e) => setFilters((f) => ({ ...f, make: e.target.value }))} className="input py-1.5 text-sm appearance-none pr-7">
            <option value="">All makes</option>
            {makes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select value={filters.model} onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))} className="input py-1.5 text-sm appearance-none pr-7">
            <option value="">All models</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {hasFilters && (
          <button onClick={() => setFilters(EMPTY_FILTERS)} className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-400 transition-colors">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header bar */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3.5">
          <div className="mr-auto">
            <h2 className="text-sm font-semibold text-gray-900">Lease Records</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasFilters ? `${filtered.length} of ${leases.length}` : leases.length} total
            </p>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, VIN, vehicle…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="input pl-7 py-1.5 text-sm w-80"
            />
            {filters.search && (
              <button onClick={() => setFilters((f) => ({ ...f, search: '' }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowActivateModal(true)}
            disabled={!hasActivatable}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors',
              hasActivatable
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            )}
          >
            <Zap size={13} />
            {hasActivatable
              ? `Activate (${selectedLeases.filter((l) => l.doc_status === 'completed' && !l.is_active).length})`
              : 'Activate Leases'}
          </button>
          <button onClick={() => setColumnsModalOpen(true)} className="btn-secondary py-1.5 text-xs flex items-center gap-1.5">
            <Columns size={13} /> Columns
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
            <button onClick={onCreateNew} className="btn-primary mt-6">
              <Plus size={15} />
              Create New Agreement
            </button>
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

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <table
              style={{ tableLayout: 'fixed', minWidth: visibleDefs.reduce((s, c) => s + c.width, 0) + 40 + 70 + 100 }}
              className="w-full border-collapse text-sm"
            >
              <thead className="sticky top-0 z-10" style={{ boxShadow: '0 1px 0 #e5e7eb' }}>
                <tr>
                  {/* Checkbox — 40 px fixed */}
                  <th style={{ width: 40, minWidth: 40 }} className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5">
                    {(() => {
                      const selectable  = filtered.filter((l) => !l.is_active)
                      const allChecked  = selectable.length > 0 && selectable.every((l) => checkedIds.has(l.id))
                      const someChecked = selectable.some((l) => checkedIds.has(l.id))
                      return (
                        <input type="checkbox" checked={allChecked}
                          ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                          disabled={selectable.length === 0}
                          onChange={() => setCheckedIds(allChecked ? new Set() : new Set(selectable.map((l) => l.id)))}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-green-600 disabled:opacity-30"
                          title={selectable.length === 0 ? 'No selectable leases' : 'Select all'}
                        />
                      )
                    })()}
                  </th>
                  {/* Details — 70 px fixed */}
                  <th style={{ width: 70, minWidth: 70 }} className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-900">Details</th>
                  {visibleDefs.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900"
                    >
                      {col.label}
                    </th>
                  ))}
                  {/* Actions — 100 px fixed */}
                  <th style={{ width: 100, minWidth: 100 }} className="border-l border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((lease) => (
                  <tr key={lease.id} className={clsx('hover:bg-gray-50 transition-colors', checkedIds.has(lease.id) && 'bg-brand-50')}>
                    {/* Checkbox */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      {lease.is_active ? (
                        <span title="Already activated" className="inline-flex items-center justify-center">
                          <CheckCircle2 size={15} className="text-green-500" />
                        </span>
                      ) : (
                        <input type="checkbox" checked={checkedIds.has(lease.id)} onChange={() => toggleCheck(lease.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-green-600 cursor-pointer"
                          title={lease.doc_status === 'completed' ? 'Select to activate' : 'Select to delete'}
                        />
                      )}
                    </td>
                    {/* Details */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <button onClick={() => setSelected(lease)} title="View lease details"
                        className="rounded p-1 text-teal-500 hover:bg-teal-50 transition-colors">
                        <Eye size={16} />
                      </button>
                    </td>
                    {visibleDefs.map((col) => (
                      <td key={col.key} className="border-r border-gray-100 px-3 py-2.5 overflow-hidden" title={getCellTitle(col.key, lease)}>
                        {renderCell(col.key, lease)}
                      </td>
                    ))}
                    {/* Actions */}
                    <td className="border-l border-gray-100 px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewingPdf(lease)} title="View lease documents"
                          className="rounded p-1 text-teal-500 hover:bg-teal-50 transition-colors">
                          <Eye size={15} />
                        </button>
                        {(() => {
                          const canEdit = lease.doc_status !== 'customer_signed' && lease.doc_status !== 'completed'
                          return (
                            <button onClick={() => canEdit && setEditingLease(lease)}
                              title={canEdit ? 'Edit lease' : 'Cannot edit — lessee has signed'}
                              disabled={!canEdit}
                              className={clsx('rounded p-1 transition-colors', canEdit ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed')}>
                              <Pencil size={15} />
                            </button>
                          )
                        })()}
                        <button onClick={() => setDeletingLease(lease)} title="Delete lease"
                          className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showActivateModal && (
        <ActivateConfirmModal
          leases={selectedLeases}
          onConfirm={confirmActivate}
          onCancel={() => setShowActivateModal(false)}
          activating={activating}
        />
      )}

      {toast && <Toast toast={toast} />}

      {columnsModalOpen && (
        <OrganizeColumnsModal
          allColumns={COLUMNS.map((c) => ({ key: c.key, label: c.label }))}
          defaultCols={DEFAULT_COLS}
          visible={visibleCols}
          onApply={(cols) => { setVisibleCols(cols as ColKey[]); setColumnsModalOpen(false) }}
          onClose={() => setColumnsModalOpen(false)}
        />
      )}

      {selected && <LeaseDetailModal lease={selected} onClose={() => setSelected(null)} />}
      {viewingPdf && (
        <PdfViewerModal
          lease={viewingPdf}
          onClose={() => setViewingPdf(null)}
          onStatusChange={handleStatusChange}
        />
      )}
      {deletingLease && (
        <DeleteConfirmModal
          lease={deletingLease}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingLease(null)}
          deleting={deleteInProgress}
        />
      )}

      {/* ── Edit lease modal ── */}
      {editingLease && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingLease(null)}
          />
          {/* Modal panel */}
          <div className="relative z-10 mx-auto my-8 w-full max-w-4xl rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Lease</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {editingLease.lessee_name}
                  {(editingLease.vehicle_year || editingLease.vehicle_make || editingLease.vehicle_model) && (
                    <> &middot; {[editingLease.vehicle_year, editingLease.vehicle_make, editingLease.vehicle_model].filter(Boolean).join(' ')}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => setEditingLease(null)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Form */}
            <div className="px-6 py-6">
              <LeaseForm
                editRecord={editingLease}
                onEditComplete={() => { setEditingLease(null); load() }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
