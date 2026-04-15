'use client'

import { useMemo, useState } from 'react'
import { ExpiredLeaseRecord } from '@/lib/expired-lease-types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { ChevronDown } from 'lucide-react'

interface Props {
  leases: ExpiredLeaseRecord[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777', '#dc2626', '#65a30d']

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s.trim() + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 mb-0.5">{label ?? payload[0].name}</p>
      <p className="text-gray-900">{payload[0].value} lease{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// Shown below each chart — red when data is missing, green when everything is present
function DataNote({ missing, field }: { missing: number; field: string }) {
  if (missing > 0) {
    return (
      <p className="mt-2 text-xs font-medium text-red-600 text-center">
        {missing} record{missing !== 1 ? 's have' : ' has'} no {field}
      </p>
    )
  }
  return (
    <p className="mt-2 text-xs font-medium text-green-600 text-center">
      All entries have a {field}
    </p>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExpiredLeasesKPIs({ leases }: Props) {

  // ── 1. By Company ────────────────────────────────────────────────────────────
  const { byCompanyData, noCompanyCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    let missing = 0
    for (const l of leases) {
      const key = (l.company ?? '').trim()
      if (!key) { missing++; continue }
      counts[key] = (counts[key] ?? 0) + 1
    }
    return {
      byCompanyData: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      noCompanyCount: missing,
    }
  }, [leases])

  // ── 2. Leases Ended Over Time ─────────────────────────────────────────────────
  const { availableYears, noLeaseEndDateCount } = useMemo(() => {
    const years = new Set<number>()
    let missing = 0
    for (const l of leases) {
      const d = parseDate(l.lease_end_date)
      if (d) years.add(d.getFullYear())
      else missing++
    }
    return {
      availableYears: Array.from(years).sort((a, b) => b - a),
      noLeaseEndDateCount: missing,
    }
  }, [leases])

  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const activeYear = selectedYear ?? availableYears[0] ?? null

  const byMonthData = useMemo(() => {
    if (activeYear === null) return []
    const counts = Array(12).fill(0)
    for (const l of leases) {
      const d = parseDate(l.lease_end_date)
      if (d && d.getFullYear() === activeYear) counts[d.getMonth()]++
    }
    return MONTH_LABELS.map((month, i) => ({ month, count: counts[i] }))
  }, [leases, activeYear])

  const totalForYear = byMonthData.reduce((s, d) => s + d.count, 0)

  // ── 3. By Year ───────────────────────────────────────────────────────────────
  const byYearData = useMemo(() => {
    const counts: Record<number, number> = {}
    let minYear: number | null = null
    for (const l of leases) {
      const d = parseDate(l.lease_end_date)
      if (!d) continue
      const y = d.getFullYear()
      counts[y] = (counts[y] ?? 0) + 1
      if (minYear === null || y < minYear) minYear = y
    }
    if (minYear === null) return []
    return Array.from({ length: 12 }, (_, i) => {
      const year = minYear! + i
      return { year: String(year), count: counts[year] ?? 0 }
    })
  }, [leases])

  // ── 4. By Customer Type ───────────────────────────────────────────────────────
  const { byCustomerTypeData, noCustomerTypeCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    let missing = 0
    for (const l of leases) {
      const key = (l.customer_type ?? '').trim()
      if (!key) { missing++; continue }
      counts[key] = (counts[key] ?? 0) + 1
    }
    return {
      byCustomerTypeData: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      noCustomerTypeCount: missing,
    }
  }, [leases])

  if (leases.length === 0) return null

  const companyChartHeight  = Math.max(180, byCompanyData.length     * 44)
  const custTypeChartHeight = Math.max(180, byCustomerTypeData.length * 44)

  return (
    <div className="space-y-5 mb-8">

      {/* ── Summary banner ── */}
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-5 py-3 flex items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Total Expired Leases</p>
        <p className="text-2xl font-bold text-brand-700">{leases.length.toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* ── 1. By Company ── */}
        <KPICard
          title="Expired Leases by Company"
          subtitle={`${byCompanyData.length} compan${byCompanyData.length === 1 ? 'y' : 'ies'}`}
        >
          <ResponsiveContainer width="100%" height={companyChartHeight}>
            <BarChart
              data={byCompanyData}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 4, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {byCompanyData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <DataNote missing={noCompanyCount} field="Company" />
        </KPICard>

        {/* ── 3. By Customer Type ── */}
        <KPICard
          title="Expired Leases by Customer Type"
          subtitle={`${byCustomerTypeData.length} type${byCustomerTypeData.length === 1 ? '' : 's'}`}
        >
          <ResponsiveContainer width="100%" height={custTypeChartHeight}>
            <BarChart
              data={byCustomerTypeData}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 4, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={130} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {byCustomerTypeData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <DataNote missing={noCustomerTypeCount} field="Customer Type" />
        </KPICard>

        {/* ── 2. Leases Ended Over Time ── */}
        <KPICard
          title="Leases Ended Over Time"
          subtitle={activeYear ? `${totalForYear} lease${totalForYear !== 1 ? 's' : ''} ended in ${activeYear}` : 'No lease end dates available'}
        >
          {/* Fixed-height control row — yearly chart gets an invisible spacer of the same height */}
          <div className="h-9 flex items-center gap-2 mb-4">
            {availableYears.length > 0 && (
              <>
                <label className="text-xs font-medium text-gray-500 shrink-0">Year</label>
                <div className="relative">
                  <select
                    value={activeYear ?? ''}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="input py-1 pr-7 text-xs appearance-none"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </>
            )}
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byMonthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(v: any) => v > 0 ? v : ''}
                  style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <DataNote missing={noLeaseEndDateCount} field="Lease End Date" />
        </KPICard>

        {/* ── 4. By Year ── */}
        {byYearData.length > 0 && (
          <KPICard
            title="Expired Leases by Year"
            subtitle={`${byYearData[0].year}–${byYearData[byYearData.length - 1].year} · 12-year window`}
          >
            {/* Spacer matches the fixed-height control row in "Leases Ended Over Time" */}
            <div className="h-9 mb-4" aria-hidden="true" />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byYearData} margin={{ top: 24, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="count"
                    position="top"
                    formatter={(v: any) => v > 0 ? v : ''}
                    style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <DataNote missing={noLeaseEndDateCount} field="Lease End Date" />
          </KPICard>
        )}

      </div>
    </div>
  )
}
