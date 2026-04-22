'use client'

import { useMemo } from 'react'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'
import { calcRevenue } from './SoldLeasesTable'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import { AlertCircle } from 'lucide-react'

interface Props {
  leases: LeasePortfolioRecord[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtMoneyCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function parseYear(soldDate: string | null | undefined): number | null {
  if (!soldDate) return null
  try {
    const d = new Date(soldDate + 'T00:00:00')
    if (isNaN(d.getTime())) return null
    return d.getFullYear()
  } catch { return null }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function FormulaLine({ label, formula, color }: { label: string; formula: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
      <span className="font-mono text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 leading-relaxed">
        {formula}
      </span>
    </div>
  )
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SoldLeasesKPIs({ leases }: Props) {

  // ── Revenue aggregation ───────────────────────────────────────────────────
  const { byYearData, excludedCount, noDateCount, includedCount, totalGross, totalNet } = useMemo(() => {
    const yearMap: Record<number, { gross: number; net: number }> = {}
    let excludedCount = 0  // missing one or more required fields
    let noDateCount   = 0  // included in calc but no sold_date (can't place on chart)
    let totalGross    = 0
    let totalNet      = 0

    for (const l of leases) {
      const rev = calcRevenue(l)
      if (rev === null) { excludedCount++; continue }

      totalGross += rev.gross
      totalNet   += rev.net

      const year = parseYear(l.sold_date)
      if (year === null) {
        noDateCount++
      } else {
        if (!yearMap[year]) yearMap[year] = { gross: 0, net: 0 }
        yearMap[year].gross += rev.gross
        yearMap[year].net   += rev.net
      }
    }

    const includedCount = leases.length - excludedCount
    const years = Object.keys(yearMap).map(Number).sort((a, b) => a - b)
    const byYearData = years.map((year) => ({
      year: String(year),
      'Gross Revenue': Math.round(yearMap[year].gross),
      'Net Revenue':   Math.round(yearMap[year].net),
    }))

    return { byYearData, excludedCount, noDateCount, includedCount, totalGross, totalNet }
  }, [leases])

  if (leases.length === 0) return null

  return (
    <div className="space-y-5 mb-8">

      {/* ── Summary banner ── */}
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-5 py-3 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div className="flex items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Total Purchased Leases</p>
          <p className="text-2xl font-bold text-brand-700">{leases.length.toLocaleString()}</p>
        </div>
        <div className="h-6 w-px bg-brand-200 hidden sm:block" />
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Gross Revenue</p>
          <p className="text-xl font-bold text-brand-700">{fmtMoney(totalGross)}</p>
        </div>
        <div className="h-6 w-px bg-brand-200 hidden sm:block" />
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Net Revenue</p>
          <p className="text-xl font-bold text-brand-700">{fmtMoney(totalNet)}</p>
        </div>
        <p className="text-xs text-brand-400 ml-auto">{includedCount.toLocaleString()} of {leases.length.toLocaleString()} records included in calculations</p>
      </div>

      {/* ── Data quality notices ── */}
      {excludedCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex gap-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-800">
            <span className="font-semibold">{excludedCount} record{excludedCount !== 1 ? 's were' : ' was'} excluded</span> from all revenue calculations — one or more required fields ({' '}
            <span className="font-mono">monthly_payment</span>,{' '}
            <span className="font-mono">term</span>,{' '}
            <span className="font-mono">monthly_liability_payment</span>,{' '}
            <span className="font-mono">balloon_payment</span>) are missing.
          </p>
        </div>
      )}
      {noDateCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">{noDateCount} record{noDateCount !== 1 ? 's are' : ' is'} missing a Sold Date</span> — included in the totals above but cannot be placed on the chart.
          </p>
        </div>
      )}

      {/* ── Formulas ── */}
      <KPICard title="Calculation Formulas" subtitle="Records with any missing required field are excluded entirely">
        <div className="space-y-3">
          <FormulaLine
            label="Gross Revenue"
            color="text-indigo-600"
            formula="(Monthly Payment × Term) + Net Sale Price"
          />
          <FormulaLine
            label="Net Revenue"
            color="text-emerald-600"
            formula="Gross Revenue − (Monthly Liability Payment × Term) − Balloon Payment"
          />
        </div>
      </KPICard>

      {/* ── Revenue by year ── */}
      <KPICard
        title="Gross vs Net Revenue by Year"
        subtitle={`Based on Sold Date · ${byYearData.length} year${byYearData.length !== 1 ? 's' : ''} with data`}
      >
        {byYearData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No records with a valid Sold Date</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byYearData} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtMoneyCompact}
                width={64}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
              />
              <Bar dataKey="Gross Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={48} />
              <Bar dataKey="Net Revenue"   fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}

      </KPICard>

    </div>
  )
}
