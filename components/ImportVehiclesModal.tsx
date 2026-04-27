'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import XlsxFileInput from '@/components/XlsxFileInput'

// ─── Importable column reference (display only, no checkboxes) ────────────────

const IMPORT_GROUPS: { name: string; cols: string[] }[] = [
  {
    name: 'Customer',
    cols: ['Company', 'Customer Name', 'Customer Type', 'Driver', 'Location', 'Phone', 'Email',
           'Billing Address', 'Billing City', 'Billing State', 'Billing ZIP'],
  },
  {
    name: 'Vehicle',
    cols: ['Year', 'Make', 'Model', 'Color', 'VIN', 'Comments', 'GPS Serial #',
           'Vehicle Acquisition Date', 'Vehicle Use Type'],
  },
  {
    name: 'Dates',
    cols: ['Lease Start', 'Lease End', 'Term (mo.)', 'NDVR Date', 'Out of Service Date',
           'Insurance Exp. Date', 'First Liability Pmt Date', 'Registration Date'],
  },
  {
    name: 'Odometer',
    cols: ['Odometer', 'Odometer Date', 'Sold Odometer'],
  },
  {
    name: 'Financials',
    cols: ['Net Cap Cost', 'Mon. Depreciation', 'Mon. Interest', 'Mon. Tax', 'Mon. Payment',
           'Lease End Residual', 'Tax Paid Upfront', 'Acquisition Fee', 'Incentive Recognition',
           'Mon. Cash Flow'],
  },
  {
    name: 'Lease Terms',
    cols: ['Annual Miles', 'Lease End Mile Fee', 'Title State', 'Plate #', 'Tax Type'],
  },
  {
    name: 'Lender',
    cols: ['Lender', 'Loan/Lease #', 'Liability Start', 'Liability End', 'Funding Amount',
           'Monthly Liability Pmt.', 'Balloon Payment', 'Mon. Dep. (SL)', 'Lender Int. Rate',
           'Lender Term', 'Lender Type', 'Liability Balance', 'Net Book Value'],
  },
  {
    name: 'Classification',
    cols: ['Contract Structure', 'Lease Type', 'Onboard Type'],
  },
  {
    name: 'Sale & Disposition',
    cols: ['Sold Date', 'Disposal Date', 'Net Sale Price', 'MMR', 'Days to Sell',
           'Disposition Fees', 'Early Term Fees', 'Sold Odometer'],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
}

export default function ImportVehiclesModal({ open, onClose, onSuccess }: Props) {
  const [file,       setFile]       = useState<File | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [result,     setResult]     = useState<{ updated: number; skipped: number; errors: { row: number; lease_id: string; message: string }[] } | null>(null)
  const [colsOpen,   setColsOpen]   = useState(false)

  if (!open) return null

  async function handleSubmit() {
    if (!file) return
    setError(null)

    // Parse client-side
    let rows: Record<string, string>[]
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array' })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
    } catch {
      setError('Could not read the file. Make sure it is a valid XLSX file.')
      return
    }

    if (rows.length === 0) {
      setError('The file contains no data rows.')
      return
    }

    const missing = rows.findIndex((r) => !r['Lease ID'] || String(r['Lease ID']).trim() === '')
    if (missing !== -1) {
      setError(`Row ${missing + 2} is missing a Lease ID. Every row must have a valid Lease ID.`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Import failed. Please try again.')
      } else {
        setResult(data)
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 2000)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setFile(null)
    setError(null)
    setResult(null)
    setLoading(false)
    setColsOpen(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 flex flex-col w-full max-w-xl rounded-xl bg-white shadow-2xl" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Import Vehicles</h2>
          <button onClick={handleClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Success state */}
          {result && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-sm font-semibold text-gray-900">
                {result.updated} record{result.updated !== 1 ? 's' : ''} updated
              </p>
              {result.skipped > 0 && (
                <p className="text-xs text-gray-500">{result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped</p>
              )}
              {result.errors.length > 0 && (
                <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left space-y-1">
                  <p className="text-xs font-semibold text-red-700">Errors ({result.errors.length})</p>
                  {result.errors.slice(0, 5).map((e) => (
                    <p key={e.row} className="text-xs text-red-600">Row {e.row}: {e.lease_id} — {e.message}</p>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="text-xs text-red-500">…and {result.errors.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          )}

          {!result && (
            <>
              {/* Upload */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Upload File</p>
                <XlsxFileInput file={file} onChange={(f) => { setFile(f); setError(null) }} />
              </div>

              {/* Required Columns accordion */}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setColsOpen((o) => !o)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="flex-1 text-xs font-medium text-gray-700">Available Columns</span>
                  {colsOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {colsOpen && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                    {/* Lease ID — special required row */}
                    <div>
                      <p className="text-xs font-semibold text-gray-800 mb-1">
                        Identifiers <span className="font-normal text-gray-400">(required — do not remove or edit)</span>
                      </p>
                      <p className="text-xs text-gray-600 font-mono bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-200">Lease ID</p>
                    </div>
                    {IMPORT_GROUPS.map((g) => (
                      <div key={g.name}>
                        <p className="text-xs font-semibold text-gray-800 mb-1">{g.name}</p>
                        <div className="flex flex-wrap gap-1">
                          {g.cols.map((col) => (
                            <span key={col} className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-yellow-800">TIPS</p>
                <ul className="space-y-0.5">
                  {[
                    'Double-check all entries for accuracy',
                    'Column names must match template exactly',
                    'Lease ID is required — do not remove or edit it',
                  ].map((tip) => (
                    <li key={tip} className="text-xs text-yellow-700 flex gap-1">
                      <span className="shrink-0">·</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <AlertTriangle size={14} className="shrink-0 text-red-500 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-gray-100">
            <button type="button" onClick={handleClose} className="btn-secondary" disabled={loading}>Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || loading}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Uploading…</>
              ) : (
                'Import'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
