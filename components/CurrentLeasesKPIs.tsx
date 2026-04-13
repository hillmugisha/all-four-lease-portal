'use client'

import { useMemo } from 'react'
import { CurrentLeaseRecord } from '@/lib/current-lease-types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'

interface DrillFilters {
  make:         string
  customerType: string
  term:         string
  expiryBucket: string
  lender:       string
}

interface Props {
  leases: CurrentLeaseRecord[]
  onViewAll?: () => void
  onDrillDown?: (filters: Partial<DrillFilters>) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseLeaseEnd(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s.trim() + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const BRAND   = '#4f46e5'
const PALETTE = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777', '#dc2626', '#65a30d', '#c026d3', '#0284c7']

const EXPIRY_COLORS: Record<string, string> = {
  '≤ 30 days':  '#dc2626',
  '31–60 days': '#f97316',
  '61–90 days': '#f59e0b',
  '90+ days':   '#059669',
}

// ─── KPI card wrapper ─────────────────────────────────────────────────────────

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

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 mb-0.5">{label ?? payload[0].name}</p>
      <p className="text-gray-900">{payload[0].value} leases</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CurrentLeasesKPIs({ leases, onViewAll, onDrillDown }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // ── 1. Upcoming expirations ─────────────────────────────────────────────────
  const { upcomingData, totalExpiring90, noEndDateCount } = useMemo(() => {
    const d30 = addDays(today, 30)
    const d60 = addDays(today, 60)
    const d90 = addDays(today, 90)

    const buckets = { '≤ 30 days': 0, '31–60 days': 0, '61–90 days': 0, '90+ days': 0 }
    let noDate = 0

    for (const l of leases) {
      const end = parseLeaseEnd(l.lease_end_date)
      if (!end) { noDate++; continue }
      if (end < today) continue
      if      (end <= d30) buckets['≤ 30 days']++
      else if (end <= d60) buckets['31–60 days']++
      else if (end <= d90) buckets['61–90 days']++
      else                 buckets['90+ days']++
    }

    const data = Object.entries(buckets).map(([label, count]) => ({ label, count }))
    const expiring = data.slice(0, 3).reduce((s, d) => s + d.count, 0)
    return { upcomingData: data, totalExpiring90: expiring, noEndDateCount: noDate }
  }, [leases, today])

  // ── 2. Leases by make ───────────────────────────────────────────────────────
  const { byMakeData, noMakeCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    let missing = 0
    for (const l of leases) {
      const make = (l.make ?? '').trim()
      if (!make) { missing++; continue }
      counts[make] = (counts[make] ?? 0) + 1
    }
    return {
      byMakeData: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      noMakeCount: missing,
    }
  }, [leases])

  // ── 3. Leases by customer type ──────────────────────────────────────────────
  const { byTypeData, noTypeCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    let missing = 0
    for (const l of leases) {
      const type = (l.customer_type ?? '').trim()
      if (!type) { missing++; continue }
      counts[type] = (counts[type] ?? 0) + 1
    }
    return {
      byTypeData: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      noTypeCount: missing,
    }
  }, [leases])

  // ── 4. Leases by term ───────────────────────────────────────────────────────
  const { byTermData, noTermCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    let missing = 0
    for (const l of leases) {
      const raw = (l.term ?? '').toString().trim()
      if (!raw || raw === 'null' || raw.toLowerCase() === 'n/a') { missing++; continue }
      counts[raw] = (counts[raw] ?? 0) + 1
    }
    return {
      byTermData: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
          const na = parseFloat(a.name), nb = parseFloat(b.name)
          return isNaN(na) || isNaN(nb) ? a.name.localeCompare(b.name) : na - nb
        }),
      noTermCount: missing,
    }
  }, [leases])

  // ── 5. Leases by lender/lessor ─────────────────────────────────────────────
  const { byLenderData, noLenderCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    let missing = 0
    for (const l of leases) {
      const lender = (l.lender_lessor ?? '').trim()
      if (!lender) { missing++; continue }
      counts[lender] = (counts[lender] ?? 0) + 1
    }
    return {
      byLenderData: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      noLenderCount: missing,
    }
  }, [leases])

  // ── 6. Total Monthly Tax ────────────────────────────────────────────────────
  const { totalMonthlyTax, taxExcludedValues } = useMemo(() => {
    let total = 0
    const excluded = new Set<string>()
    for (const l of leases) {
      const raw = (l.monthly_tax ?? '').toString().trim()
      if (!raw) continue
      const cleaned = raw.replace(/^\$/, '').replace(/,/g, '')
      const n = parseFloat(cleaned)
      if (!isNaN(n)) {
        total += n
      } else {
        excluded.add(raw)
      }
    }
    return { totalMonthlyTax: total, taxExcludedValues: Array.from(excluded).sort() }
  }, [leases])

  if (leases.length === 0) return null

  // Shared chart height for horizontal bar charts (scales with data rows)
  const makeChartHeight   = Math.max(260, byMakeData.length   * 34)
  const typeChartHeight   = Math.max(260, byTypeData.length   * 34)
  const lenderChartHeight = Math.max(260, byLenderData.length * 34)

  return (
    <div className="space-y-5 mb-8">

      {/* ── Total Active Leases banner ── */}
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Total Active Leases</p>
          <p className="text-2xl font-bold text-brand-700">{leases.length.toLocaleString()}</p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
          >
            View All →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* ── 1. Upcoming Expirations ── */}
        <KPICard
          title="Upcoming Expirations"
          subtitle={`${totalExpiring90} leases ending within 90 days`}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={upcomingData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                cursor={onDrillDown ? 'pointer' : undefined}
                onClick={(data) => onDrillDown?.({ expiryBucket: data.label })}
              >
                {upcomingData.map((entry) => (
                  <Cell key={entry.label} fill={EXPIRY_COLORS[entry.label]} />
                ))}
                <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {noEndDateCount > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600 text-center">
              {noEndDateCount} vehicle{noEndDateCount !== 1 ? 's' : ''} have no Lease End date
            </p>
          )}
        </KPICard>

        {/* ── 2. Leases by Make ── */}
        <KPICard title="Leases by Make" subtitle={`Top ${byMakeData.length} makes`}>
          <ResponsiveContainer width="100%" height={makeChartHeight}>
            <BarChart
              data={byMakeData}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 4, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                cursor={onDrillDown ? 'pointer' : undefined}
                onClick={(data) => onDrillDown?.({ make: data.name })}
              >
                {byMakeData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {noMakeCount > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600 text-center">
              {noMakeCount} vehicle{noMakeCount !== 1 ? 's' : ''} have no Make
            </p>
          )}
        </KPICard>

        {/* ── 3. Leases by Customer Type ── */}
        <KPICard title="Customer Type" subtitle={`${byTypeData.length} types`}>
          <ResponsiveContainer width="100%" height={typeChartHeight}>
            <BarChart
              data={byTypeData}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 4, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                cursor={onDrillDown ? 'pointer' : undefined}
                onClick={(data) => onDrillDown?.({ customerType: data.name })}
              >
                {byTypeData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {noTypeCount > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600 text-center">
              {noTypeCount} vehicle{noTypeCount !== 1 ? 's' : ''} have no Customer Type
            </p>
          )}
        </KPICard>

        {/* ── 4. Leases by Term ── */}
        <KPICard title="Leases by Term" subtitle="Grouped by months">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byTermData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar
                dataKey="value"
                fill={BRAND}
                radius={[4, 4, 0, 0]}
                cursor={onDrillDown ? 'pointer' : undefined}
                onClick={(data) => onDrillDown?.({ term: data.name })}
              >
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {noTermCount > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600 text-center">
              {noTermCount} vehicle{noTermCount !== 1 ? 's' : ''} have no Term
            </p>
          )}
        </KPICard>

        {/* ── 5. Leases by Lender/Lessor ── */}
        <KPICard title="Leases by Lender / Lessor" subtitle={`${byLenderData.length} lenders`}>
          <ResponsiveContainer width="100%" height={lenderChartHeight}>
            <BarChart
              data={byLenderData}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 4, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                cursor={onDrillDown ? 'pointer' : undefined}
                onClick={(data) => onDrillDown?.({ lender: data.name })}
              >
                {byLenderData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {noLenderCount > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600 text-center">
              {noLenderCount} vehicle{noLenderCount !== 1 ? 's' : ''} have no Lender / Lessor
            </p>
          )}
        </KPICard>

        {/* ── 6. Total Monthly Tax ── */}
        <KPICard title="Total Monthly Tax" subtitle="Sum of all numeric monthly tax values">
          <div className="flex flex-col gap-4">
            {/* Big number */}
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {totalMonthlyTax.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-gray-400 mb-1.5">/ month</span>
            </div>

            {/* Excluded values */}
            {taxExcludedValues.length > 0 && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-2">Excluded values:</p>
                <div className="flex flex-wrap gap-1.5">
                  {taxExcludedValues.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </KPICard>

      </div>

    </div>
  )
}
