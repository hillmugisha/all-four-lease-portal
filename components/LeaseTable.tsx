'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { LeaseRecord } from '@/lib/types'
import { fmt, fmtDate } from '@/lib/calculations'
import { FileDown, RefreshCw, Plus, Eye, X, Search, ChevronDown, Trash2, Download, Printer, AlertTriangle, Zap, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<LeaseRecord['doc_status'], string> = {
  draft:           'bg-gray-100 text-gray-500',
  sent:            'bg-amber-50 text-amber-700',
  customer_signed: 'bg-purple-50 text-purple-700',
  completed:       'bg-green-50 text-green-700',
}
const STATUS_LABELS: Record<LeaseRecord['doc_status'], string> = {
  draft:           'Draft',
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

// ─── PDF Viewer Modal ─────────────────────────────────────────────────────────

interface SignerInfo {
  name:          string
  email:         string
  routing_order: string
  status:        string    // 'created' | 'sent' | 'delivered' | 'completed' | 'declined'
  signed_at:     string | null
}

interface EnvelopeStatusResponse {
  doc_status:      LeaseRecord['doc_status']
  envelope_status: string | null
  hasEnvelope:     boolean
  signed_count:    number
  total_count:     number
  signers:         SignerInfo[]
}

function SignerBadge({ signers, signedCount, totalCount, isCompleted, checking }: {
  signers:     SignerInfo[]
  signedCount: number
  totalCount:  number
  isCompleted: boolean
  checking:    boolean
}) {
  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-900/60 px-2.5 py-0.5 text-xs font-medium text-green-300">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        Fully Executed
      </span>
    )
  }
  if (totalCount === 0) return null
  return (
    <div className="relative group">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-900/60 px-2.5 py-0.5 text-xs font-medium text-amber-300 cursor-default">
        {checking
          ? <RefreshCw size={10} className="animate-spin" />
          : <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        {signedCount} / {totalCount} signed
      </span>
      {/* Tooltip — list each signer */}
      {signers.length > 0 && (
        <div className="pointer-events-none absolute right-0 top-full mt-1.5 z-20 hidden group-hover:block
                        w-56 rounded-lg bg-gray-900 border border-gray-700 shadow-xl p-2 space-y-1.5">
          {signers.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={clsx(
                'h-2 w-2 shrink-0 rounded-full',
                s.status === 'completed' ? 'bg-green-400' : 'bg-gray-500',
              )} />
              <span className="truncate text-gray-300">{s.name || s.email}</span>
              <span className={clsx(
                'ml-auto shrink-0 font-medium',
                s.status === 'completed' ? 'text-green-400' : 'text-gray-500',
              )}>
                {s.status === 'completed' ? 'Signed' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const POLL_INTERVAL_MS = 30_000

function PdfViewerModal({
  lease,
  onClose,
  onStatusChange,
}: {
  lease:           LeaseRecord
  onClose:         () => void
  onStatusChange?: (leaseId: string, status: LeaseRecord['doc_status']) => void
}) {
  const [pdfUrl, setPdfUrl]         = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(true)
  const [pdfError, setPdfError]     = useState<string | null>(null)
  const [checking, setChecking]     = useState(false)
  const [signers, setSigners]       = useState<SignerInfo[]>([])
  const [signedCount, setSignedCount] = useState(0)
  const [totalCount, setTotalCount]   = useState(0)
  const [docStatus, setDocStatus]     = useState<LeaseRecord['doc_status']>(lease.doc_status)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const filename  = `lease-${lease.lessee_name.replace(/\s+/g, '-')}-${lease.vehicle_vin}.pdf`
  const hasEnvelope = !!lease.docusign_envelope_id

  // ── Effect: initial PDF load + polling ──────────────────────────────────────
  useEffect(() => {
    let objectUrl: string | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    // Plain-object refs so interval closure always sees the latest values
    const state = {
      docStatus:   lease.doc_status as LeaseRecord['doc_status'],
      signedCount: 0,
    }

    async function loadPdf() {
      if (cancelled) return
      setLoadingPdf(true)
      setPdfError(null)

      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }

      try {
        let res: Response
        if (hasEnvelope) {
          // Always fetch the live signed version from DocuSign
          res = await fetch(`/api/leases/${lease.id}/signed-pdf`)
        } else {
          // Fallback: re-generate from form data (draft / pre-DocuSign leases)
          res = await fetch('/api/generate-pdf', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ record: lease }),
          })
        }

        if (!res.ok) { if (!cancelled) setPdfError('Failed to load PDF'); return }

        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPdfUrl(objectUrl)
      } catch {
        if (!cancelled) setPdfError('Failed to load PDF')
      } finally {
        if (!cancelled) setLoadingPdf(false)
      }
    }

    async function syncStatus() {
      if (cancelled || !hasEnvelope) return
      setChecking(true)

      try {
        const res = await fetch(`/api/leases/${lease.id}/envelope-status`)
        if (!res.ok || cancelled) return
        const data: EnvelopeStatusResponse = await res.json()
        if (cancelled) return

        setSigners(data.signers)
        setSignedCount(data.signed_count)
        setTotalCount(data.total_count)

        const statusChanged  = data.doc_status !== state.docStatus
        const moreSignatures = data.signed_count > state.signedCount

        state.signedCount = data.signed_count

        if (statusChanged) {
          state.docStatus = data.doc_status
          setDocStatus(data.doc_status)
          onStatusChange?.(lease.id, data.doc_status)
        }

        // Re-fetch PDF whenever a new signature appears or status advances
        if (moreSignatures || statusChanged) {
          await loadPdf()
        }

        // Stop polling once fully executed
        if (data.doc_status === 'completed' && pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      } catch { /* silent — retry on next tick */ }
      finally {
        if (!cancelled) setChecking(false)
      }
    }

    // Kick off initial load
    loadPdf()

    if (hasEnvelope && lease.doc_status !== 'completed') {
      syncStatus()
      pollTimer = setInterval(syncStatus, POLL_INTERVAL_MS)
    } else if (hasEnvelope && lease.doc_status === 'completed') {
      // Still fetch signers so the badge populates
      syncStatus()
    }

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease.id])

  // ── Download / Print ────────────────────────────────────────────────────────
  function handleDownload() {
    if (!pdfUrl) return
    const a    = document.createElement('a')
    a.href     = pdfUrl
    a.download = filename
    a.click()
  }

  function handlePrint() {
    if (!iframeRef.current?.contentWindow) return
    iframeRef.current.contentWindow.print()
  }

  const isCompleted = docStatus === 'completed'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 flex w-full max-w-5xl flex-col rounded-xl bg-gray-900 shadow-2xl overflow-hidden"
        style={{ height: '90vh' }}
      >
        {/* ── Toolbar ── */}
        <div className="flex shrink-0 items-center justify-between bg-gray-800 px-4 py-2.5 gap-3">
          {/* Left: filename + signing badge */}
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-sm font-medium text-gray-200">{filename}</span>
            {hasEnvelope && (
              <SignerBadge
                signers={signers}
                signedCount={signedCount}
                totalCount={totalCount}
                isCompleted={isCompleted}
                checking={checking}
              />
            )}
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={handleDownload}
              disabled={!pdfUrl}
              title="Download"
              className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              <Download size={15} />
              Download
            </button>
            <button
              onClick={handlePrint}
              disabled={!pdfUrl}
              title="Print"
              className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              <Printer size={15} />
              Print
            </button>
            <div className="mx-1 h-5 w-px bg-gray-600" />
            <button
              onClick={onClose}
              title="Close"
              className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {loadingPdf && (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <RefreshCw size={24} className="animate-spin" />
              <span className="text-sm">
                {hasEnvelope ? 'Loading signed document…' : 'Generating PDF…'}
              </span>
            </div>
          </div>
        )}
        {!loadingPdf && pdfError && (
          <div className="flex flex-1 items-center justify-center text-red-400 text-sm">{pdfError}</div>
        )}
        {pdfUrl && (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className="flex-1 w-full border-0 bg-gray-700"
            title={filename}
          />
        )}
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

      {/* Doc Status filter — options keyed by raw value but displayed as labels */}
      <div className="min-w-[160px]">
        <label className="mb-1 block text-xs font-medium text-gray-500">Doc Status</label>
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => set('status', e.target.value)}
            className="input py-1.5 text-sm appearance-none pr-7 w-full"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s as LeaseRecord['doc_status']] ?? s}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

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
  const [leases, setLeases]           = useState<LeaseRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<LeaseRecord | null>(null)
  const [viewingPdf, setViewingPdf]   = useState<LeaseRecord | null>(null)
  const [deletingLease, setDeletingLease] = useState<LeaseRecord | null>(null)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [filters, setFilters]         = useState<Filters>({ name: '', status: '', year: '', make: '', model: '' })
  const [colWidths, setColWidths]     = useState<number[]>(DEFAULT_WIDTHS)

  // Bulk-activate state
  const [checkedIds, setCheckedIds]           = useState<Set<string>>(new Set())
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [activating, setActivating]           = useState(false)
  const [toast, setToast]                     = useState<ToastState | null>(null)

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

  // Derived: leases selected that are eligible (completed + not yet active)
  const selectedLeases = useMemo(
    () => leases.filter((l) => checkedIds.has(l.id)),
    [leases, checkedIds],
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActivateModal(true)}
              disabled={checkedIds.size === 0}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors',
                checkedIds.size > 0
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              <Zap size={13} />
              {checkedIds.size > 0
                ? `Activate ${checkedIds.size} Lease${checkedIds.size !== 1 ? 's' : ''}`
                : 'Activate Leases'}
            </button>
            <button onClick={load} className="btn-secondary py-1.5 text-xs" disabled={loading}>
              <RefreshCw size={13} className={clsx(loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
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
              style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) + 40 }}
              className="border-collapse text-sm"
            >
              <thead>
                <tr className="border-b border-gray-200">
                  {/* Checkbox column — fixed 40 px, not resizable */}
                  <th
                    style={{ width: 40, minWidth: 40 }}
                    className="border-r border-gray-200 bg-gray-50 px-3 py-2.5"
                  >
                    {(() => {
                      const eligible = filtered.filter(
                        (l) => l.doc_status === 'completed' && !l.is_active,
                      )
                      const allChecked =
                        eligible.length > 0 && eligible.every((l) => checkedIds.has(l.id))
                      const someChecked = eligible.some((l) => checkedIds.has(l.id))
                      return (
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked && !allChecked
                          }}
                          disabled={eligible.length === 0}
                          onChange={() => {
                            if (allChecked) {
                              setCheckedIds(new Set())
                            } else {
                              setCheckedIds(new Set(eligible.map((l) => l.id)))
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-green-600 disabled:opacity-30"
                          title={eligible.length === 0 ? 'No eligible leases' : 'Select all completed leases'}
                        />
                      )
                    })()}
                  </th>
                  {/* All named columns */}
                  {COL_HEADERS.map((h, i) => (
                    <ResizableTh key={h} width={colWidths[i]} onResize={(d) => resizeCol(i, d)}>
                      {h}
                    </ResizableTh>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50 transition-colors">
                    {/* Select checkbox */}
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      {lease.is_active ? (
                        <span title="Already activated" className="inline-flex items-center justify-center">
                          <CheckCircle2 size={15} className="text-green-500" />
                        </span>
                      ) : lease.doc_status === 'completed' ? (
                        <input
                          type="checkbox"
                          checked={checkedIds.has(lease.id)}
                          onChange={() => toggleCheck(lease.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-green-600 cursor-pointer"
                          title="Select to activate"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          disabled
                          className="h-3.5 w-3.5 rounded border-gray-300 opacity-30 cursor-not-allowed"
                          title="Only completed leases can be activated"
                        />
                      )}
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingPdf(lease)}
                          title="View lease agreement"
                          className="rounded p-1 text-teal-500 hover:bg-teal-50 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingLease(lease)}
                          title="Delete lease agreement"
                          className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
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
    </>
  )
}
