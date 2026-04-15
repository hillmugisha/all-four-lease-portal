'use client'

import { useState, useEffect, useRef } from 'react'
import { LeaseRecord } from '@/lib/types'
import { RefreshCw, Download, Printer, X } from 'lucide-react'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── SignerBadge ──────────────────────────────────────────────────────────────

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

// ─── PdfViewerModal ───────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000

export function PdfViewerModal({
  lease,
  onClose,
  onStatusChange,
  preloadedUrl,
}: {
  lease:           LeaseRecord
  onClose:         () => void
  onStatusChange?: (leaseId: string, status: LeaseRecord['doc_status']) => void
  /** When provided, skips internal fetch and uses this URL directly. */
  preloadedUrl?:   string
}) {
  const [pdfUrl, setPdfUrl]         = useState<string | null>(preloadedUrl ?? null)
  const [loadingPdf, setLoadingPdf] = useState(!preloadedUrl)
  const [pdfError, setPdfError]     = useState<string | null>(null)
  const [checking, setChecking]     = useState(false)
  const [signers, setSigners]       = useState<SignerInfo[]>([])
  const [signedCount, setSignedCount] = useState(0)
  const [totalCount, setTotalCount]   = useState(0)
  const [docStatus, setDocStatus]     = useState<LeaseRecord['doc_status']>(lease.doc_status)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const filename  = `lease-${(lease.lessee_name ?? '').replace(/\s+/g, '-')}-${lease.vehicle_vin ?? ''}.pdf`
  const hasEnvelope = !!lease.docusign_envelope_id

  // ── Effect: initial PDF load + polling ──────────────────────────────────────
  useEffect(() => {
    // If the parent provided a URL, nothing to fetch — just display it
    if (preloadedUrl) return

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
