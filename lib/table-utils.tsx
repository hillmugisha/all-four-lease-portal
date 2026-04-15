/**
 * table-utils.tsx
 * Shared formatting helpers and micro-components used across all lease table views.
 */

import React from 'react'

// ─── Formatting ───────────────────────────────────────────────────────────────

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—'
  try {
    const d = new Date(v + 'T00:00:00')
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '—' }
}

export function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

/** For columns that can be numeric OR free text (e.g. "Paid Upfront", "Exempt"). */
export function fmtMoneyOrText(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return fmtMoney(v)
  const trimmed = v.trim()
  if (!trimmed) return '—'
  const n = parseFloat(trimmed.replace(/[$,]/g, ''))
  return isNaN(n) ? trimmed : fmtMoney(n)
}

// ─── Detail modal micro-components ───────────────────────────────────────────

export function DR({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined ? '—' : value
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500 shrink-0 mr-4">{label}</span>
      <span className="font-medium text-gray-900 text-right break-all">{display}</span>
    </div>
  )
}

export function MS({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{title}</h3>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-1 mb-4">{children}</div>
    </div>
  )
}
