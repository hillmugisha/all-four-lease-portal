'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'
import { VehicleOnOrderRecord } from '@/lib/vehicles-on-order-types'
import { FolderOpen, CalendarX, Truck, Users } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
  ComposedChart, Line,
} from 'recharts'
import type { NetCashMonthlyPoint } from '@/app/api/portfolio/net-cash-monthly/route'
import type { PnLMonthlyPoint } from '@/app/api/portfolio/pnl-monthly/route'

const POLL_INTERVAL = 60_000
const CHART_YEAR = new Date().getFullYear()

const PALETTE = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777', '#dc2626', '#65a30d']

const NET_CASH = {
  active:   '#1D9E75',
  oos:      '#5DCAA5',
  demo:     '#9FE1CB',
  outflows: '#D85A30',
  net:      '#042C53',
}

const PNL = {
  active:      '#534AB7',
  oos:         '#7F77DD',
  demo:        '#AFA9EC',
  interest:    '#D85A30',
  depreciation:'#BA7517',
  profit:      '#042C53',
}

const EXPIRY_COLORS: Record<string, string> = {
  '≤ 30 days':  '#dc2626',
  '31–60 days': '#f97316',
  '61–90 days': '#f59e0b',
  '90+ days':   '#059669',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s.trim() + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
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
      <p className="text-gray-900">{payload[0].value} leases</p>
    </div>
  )
}

function fmtKpi(k: number): string {
  const sign = k < 0 ? '-' : k > 0 ? '+' : ''
  const abs  = Math.abs(k)
  return abs >= 1000
    ? `${sign}$${(abs / 1000).toFixed(2)}M`
    : `${sign}$${Math.round(abs)}K`
}

function fmtAbs(k: number): string {
  const abs = Math.abs(k)
  return abs >= 1000 ? `$${(abs / 1000).toFixed(1)}M` : `$${Math.round(abs)}K`
}

const fmtTick = (v: number) =>
  v === 0 ? '$0K' : (v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)) + 'K'

function NetCashTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const order = ['active', 'oos', 'demo', 'outflows', 'net_cash']
  const labels: Record<string, string> = {
    active: 'Inflows · Active', oos: 'Inflows · OOS', demo: 'Inflows · Demo',
    outflows: 'Financing outflows', net_cash: 'Net cash',
  }
  const colors: Record<string, string> = {
    active: NET_CASH.active, oos: NET_CASH.oos, demo: NET_CASH.demo,
    outflows: NET_CASH.outflows, net_cash: NET_CASH.net,
  }
  const sorted = [...payload].sort((a, b) => order.indexOf(a.dataKey) - order.indexOf(b.dataKey))
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {sorted.map((p: any) => (
        <p key={p.dataKey} style={{ color: colors[p.dataKey] }} className="leading-5">
          {labels[p.dataKey]}: {fmtTick(p.value)}
        </p>
      ))}
    </div>
  )
}

function PnLTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const order = ['rev_active', 'rev_oos', 'rev_demo', 'interest', 'depreciation', 'profit']
  const labels: Record<string, string> = {
    rev_active:   'Revenue · Active',
    rev_oos:      'Revenue · OOS',
    rev_demo:     'Revenue · Demo',
    interest:     'Interest expense',
    depreciation: 'Depreciation',
    profit:       'Profit',
  }
  const colors: Record<string, string> = {
    rev_active:   PNL.active,
    rev_oos:      PNL.oos,
    rev_demo:     PNL.demo,
    interest:     PNL.interest,
    depreciation: PNL.depreciation,
    profit:       PNL.profit,
  }
  const negatedKeys = new Set(['interest', 'depreciation'])
  const sorted = [...payload].sort((a, b) => order.indexOf(a.dataKey) - order.indexOf(b.dataKey))
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {sorted.map((p: any) => (
        <p key={p.dataKey} style={{ color: colors[p.dataKey] }} className="leading-5">
          {labels[p.dataKey]}: {negatedKeys.has(p.dataKey) ? fmtAbs(p.value) : fmtTick(p.value)}
        </p>
      ))}
    </div>
  )
}

function SkeletonCard({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-100 animate-pulse ${tall ? 'h-72' : 'h-36'}`} />
  )
}

function StatCard({
  label,
  count,
  Icon,
  iconClass,
  iconBg,
  accent,
  viewAllHref,
  comingSoon = false,
}: {
  label: string
  count?: number
  Icon: React.ElementType
  iconClass: string
  iconBg: string
  accent: string
  viewAllHref?: string
  comingSoon?: boolean
}) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border border-green-100 bg-gradient-to-br ${accent} via-white to-green-50 px-4 py-4 shadow-sm select-none transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:border-green-300 hover:to-green-100`}>
      <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-green-100 opacity-40 transition-all duration-200 group-hover:opacity-70 group-hover:scale-125" />
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
        <Icon size={18} className={iconClass} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-900 leading-tight">{label}</p>
      <div className="flex items-end justify-between mt-0.5">
        {comingSoon ? (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-400 tracking-wide uppercase mt-1">Coming Soon</span>
        ) : (
          <p className="text-2xl font-bold text-gray-900 leading-tight">{count?.toLocaleString()}</p>
        )}
        {viewAllHref && !comingSoon && (
          <Link href={viewAllHref} className="text-[11px] font-medium text-brand-600 hover:underline leading-tight pb-0.5">
            View all →
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PortfolioOverview() {
  const [activeLeases, setActiveLeases] = useState<LeasePortfolioRecord[]>([])
  const [oosLeases, setOosLeases]       = useState<LeasePortfolioRecord[]>([])
  const [vehicles, setVehicles]         = useState<VehicleOnOrderRecord[]>([])
  const [netCashData, setNetCashData]   = useState<NetCashMonthlyPoint[]>([])
  const [pnlData, setPnlData]           = useState<PnLMonthlyPoint[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [activeRes, oosRes, vooRes, ncRes, pnlRes] = await Promise.all([
        fetch('/api/current-leases'),
        fetch('/api/expired-leases'),
        fetch('/api/vehicles-on-order', { cache: 'no-store' }),
        fetch('/api/portfolio/net-cash-monthly'),
        fetch('/api/portfolio/pnl-monthly'),
      ])
      if (!activeRes.ok || !oosRes.ok || !vooRes.ok || !ncRes.ok || !pnlRes.ok) throw new Error('Failed to fetch portfolio data')
      const [activeData, oosData, vooData, ncData, pnlRaw] = await Promise.all([
        activeRes.json(),
        oosRes.json(),
        vooRes.json(),
        ncRes.json(),
        pnlRes.json(),
      ])
      setActiveLeases(activeData)
      setOosLeases(oosData)
      setVehicles(vooData)
      setNetCashData(ncData)
      setPnlData(pnlRaw)
      setError(null)
    } catch (e) {
      if (!silent) setError(String(e))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => { load() }, [load])

  // Layer 1: BroadcastChannel — immediate cross-tab sync
  useEffect(() => {
    let channel: BroadcastChannel
    try {
      channel = new BroadcastChannel('lease-updates')
      channel.onmessage = (e) => {
        if (e.data?.type === 'lease-activated' || e.data?.type === 'lease-status-changed') {
          load(true)
        }
      }
    } catch { /* BroadcastChannel not supported */ }
    return () => { try { channel?.close() } catch { /* ignore */ } }
  }, [load])

  // Layer 2: Visibility change — refresh when user returns to this tab
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [load])

  // Layer 3: Silent background polling every 60 seconds
  useEffect(() => {
    const id = setInterval(() => load(true), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [load])

  // ── Chart data derivations ────────────────────────────────────────────────

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Upcoming expirations bucketed by time window
  const { upcomingData, noEndDateCount } = useMemo(() => {
    const d30 = addDays(today, 30)
    const d60 = addDays(today, 60)
    const d90 = addDays(today, 90)
    const buckets = { '≤ 30 days': 0, '31–60 days': 0, '61–90 days': 0, '90+ days': 0 }
    let noDate = 0
    for (const l of activeLeases) {
      const end = parseDate(l.lease_end_date)
      if (!end) { noDate++; continue }
      if (end < today) continue
      if      (end <= d30) buckets['≤ 30 days']++
      else if (end <= d60) buckets['31–60 days']++
      else if (end <= d90) buckets['61–90 days']++
      else                 buckets['90+ days']++
    }
    return {
      upcomingData: Object.entries(buckets).map(([label, count]) => ({ label, count, fill: EXPIRY_COLORS[label] })),
      noEndDateCount: noDate,
    }
  }, [activeLeases, today])

  // Active leases grouped by customer type
  const { byTypeData, noTypeCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    let missing = 0
    for (const l of activeLeases) {
      const type = (l.customer_type ?? '').trim()
      if (!type) { missing++; continue }
      counts[type] = (counts[type] ?? 0) + 1
    }
    return {
      byTypeData: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .map((d, i) => ({ ...d, fill: PALETTE[i % PALETTE.length] })),
      noTypeCount: missing,
    }
  }, [activeLeases])

  // Total monthly tax (numeric sum of active leases)
  const { totalMonthlyTax, taxExcludedValues } = useMemo(() => {
    let total = 0
    const excluded = new Set<string>()
    for (const l of activeLeases) {
      const raw = ((l as any).monthly_tax ?? '').toString().trim()
      if (!raw) continue
      const cleaned = raw.replace(/^\$/, '').replace(/,/g, '')
      const n = parseFloat(cleaned)
      if (!isNaN(n)) total += n
      else excluded.add(raw)
    }
    return { totalMonthlyTax: total, taxExcludedValues: Array.from(excluded).sort() }
  }, [activeLeases])

  // Net cash chart data + YTD KPI tiles
  const netCashChartData = useMemo(() =>
    netCashData.map(d => ({
      month:    d.month,
      active:   d.inflows_active,
      oos:      d.inflows_oos,
      demo:     d.inflows_demo,
      outflows: -d.outflows_financing,
      net_cash: d.inflows_active + d.inflows_oos + d.inflows_demo - d.outflows_financing,
    })),
  [netCashData])

  const { ytdInflowsK, ytdOutflowsK, ytdNetK } = useMemo(() => {
    let inflows = 0, outflows = 0
    for (const d of netCashData) {
      inflows  += d.inflows_active + d.inflows_oos + d.inflows_demo
      outflows += d.outflows_financing
    }
    return { ytdInflowsK: inflows, ytdOutflowsK: outflows, ytdNetK: inflows - outflows }
  }, [netCashData])

  const pnlChartData = useMemo(() =>
    pnlData.map(d => ({
      month:       d.month,
      rev_active:  d.revenue_active,
      rev_oos:     d.revenue_oos,
      rev_demo:    d.revenue_demo,
      interest:    -d.interest_expense,
      depreciation:-d.depreciation,
      profit:      d.revenue_active + d.revenue_oos + d.revenue_demo - d.interest_expense - d.depreciation,
    })),
  [pnlData])

  const { ytdRevenueK, ytdInterestK, ytdDepreciationK, ytdProfitK } = useMemo(() => {
    let rev = 0, interest = 0, dep = 0
    for (const d of pnlData) {
      rev      += d.revenue_active + d.revenue_oos + d.revenue_demo
      interest += d.interest_expense
      dep      += d.depreciation
    }
    return { ytdRevenueK: rev, ytdInterestK: interest, ytdDepreciationK: dep, ytdProfitK: rev - interest - dep }
  }, [pnlData])

  // OOS leases grouped by company
  const { byCompanyData, noCompanyCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    let missing = 0
    for (const l of oosLeases) {
      const key = (l.company_name ?? '').trim()
      if (!key) { missing++; continue }
      counts[key] = (counts[key] ?? 0) + 1
    }
    return {
      byCompanyData: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .map((d, i) => ({ ...d, fill: PALETTE[i % PALETTE.length] })),
      noCompanyCount: missing,
    }
  }, [oosLeases])

  const typeChartHeight    = Math.max(180, byTypeData.length    * 44)
  const companyChartHeight = Math.max(180, byCompanyData.length * 44)

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} tall />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} tall />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} tall />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Failed to load portfolio data: {error}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Row 1: Summary metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Active Leases"
          count={activeLeases.length}
          Icon={FolderOpen}
          iconClass="text-indigo-600"
          iconBg="bg-indigo-100"
          accent="from-indigo-50"
          viewAllHref="/current-leases"
        />
        <StatCard
          label="Out of Service"
          count={oosLeases.length}
          Icon={CalendarX}
          iconClass="text-amber-600"
          iconBg="bg-amber-100"
          accent="from-amber-50"
          viewAllHref="/leases/expired"
        />
        <StatCard
          label="Vehicles on Order"
          count={vehicles.length}
          Icon={Truck}
          iconClass="text-teal-600"
          iconBg="bg-teal-100"
          accent="from-teal-50"
          viewAllHref="/vehicles-on-order"
        />
        <StatCard
          label="Total Units — Employee Demo"
          Icon={Users}
          iconClass="text-purple-600"
          iconBg="bg-purple-100"
          accent="from-purple-50"
          comingSoon
        />
      </div>

      {/* ── Row 2: Net Cash (left) + P&L Performance (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <KPICard title="Net cash" subtitle="Monthly lease inflows vs. financing outflows">
          {/* KPI tiles */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-[13px] text-gray-500 mb-1.5">Lease inflows (YTD)</p>
              <p className="text-2xl font-medium text-gray-900">{fmtKpi(ytdInflowsK)}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-[13px] text-gray-500 mb-1.5">Financing outflows (YTD)</p>
              <p className="text-2xl font-medium text-gray-900">{fmtKpi(ytdOutflowsK)}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-[13px] text-gray-500 mb-1.5">Net cash (YTD)</p>
              <p className="text-2xl font-medium" style={{ color: ytdNetK >= 0 ? '#0F6E56' : '#A32D2D' }}>
                {fmtKpi(ytdNetK)}
              </p>
            </div>
          </div>

          {/* Custom legend */}
          <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-500">
            {([
              { key: 'active',   label: 'Inflows · Active',     color: NET_CASH.active,   type: 'square' },
              { key: 'oos',      label: 'Inflows · OOS',        color: NET_CASH.oos,      type: 'square' },
              { key: 'demo',     label: 'Inflows · Demo',       color: NET_CASH.demo,     type: 'square' },
              { key: 'outflows', label: 'Financing outflows',   color: NET_CASH.outflows, type: 'square' },
              { key: 'net',      label: 'Net cash',             color: NET_CASH.net,      type: 'line'   },
            ] as const).map(item => (
              <span key={item.key} className="flex items-center gap-1.5">
                {item.type === 'square'
                  ? <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block', flexShrink: 0 }} />
                  : <span style={{ width: 18, height: 2, background: item.color, display: 'inline-block', flexShrink: 0 }} />
                }
                {item.label}
              </span>
            ))}
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={netCashChartData} margin={{ top: 4, right: 8, left: -4, bottom: 20 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#888780' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                label={{ value: String(CHART_YEAR), position: 'insideBottom', offset: -10, fontSize: 12, fill: '#6b7280', fontWeight: 600 }}
              />
              <YAxis
                tickFormatter={fmtTick}
                tick={{ fontSize: 11, fill: '#888780' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<NetCashTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
              <Bar dataKey="active"   stackId="in"  fill={NET_CASH.active}   isAnimationActive={false} />
              <Bar dataKey="oos"      stackId="in"  fill={NET_CASH.oos}      isAnimationActive={false} />
              <Bar dataKey="demo"     stackId="in"  fill={NET_CASH.demo}     isAnimationActive={false} />
              <Bar dataKey="outflows" stackId="out" fill={NET_CASH.outflows} isAnimationActive={false} />
              <Line
                dataKey="net_cash"
                stroke={NET_CASH.net}
                strokeWidth={2}
                dot={{ r: 3, fill: NET_CASH.net, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                type="monotone"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </KPICard>

        <KPICard title="P&L performance" subtitle="Monthly revenue vs. interest expense and depreciation">
          {/* KPI tiles */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-[13px] text-gray-500 mb-1.5">Revenue (YTD)</p>
              <p className="text-[22px] font-medium text-gray-900">{fmtAbs(ytdRevenueK)}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-[13px] text-gray-500 mb-1.5">Interest expense (YTD)</p>
              <p className="text-[22px] font-medium text-gray-900">{fmtAbs(ytdInterestK)}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-[13px] text-gray-500 mb-1.5">Depreciation (YTD)</p>
              <p className="text-[22px] font-medium text-gray-900">{fmtAbs(ytdDepreciationK)}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-[13px] text-gray-500 mb-1.5">Profit (YTD)</p>
              <p className="text-[22px] font-medium" style={{ color: ytdProfitK >= 0 ? '#0F6E56' : '#A32D2D' }}>
                {fmtKpi(ytdProfitK)}
              </p>
            </div>
          </div>

          {/* Custom legend */}
          <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-500">
            {([
              { key: 'rev_active',   label: 'Revenue · Active',   color: PNL.active,       type: 'square' },
              { key: 'rev_oos',      label: 'Revenue · OOS',      color: PNL.oos,          type: 'square' },
              { key: 'rev_demo',     label: 'Revenue · Demo',     color: PNL.demo,         type: 'square' },
              { key: 'interest',     label: 'Interest expense',   color: PNL.interest,     type: 'square' },
              { key: 'depreciation', label: 'Depreciation',       color: PNL.depreciation, type: 'square' },
              { key: 'profit',       label: 'Profit',             color: PNL.profit,       type: 'line'   },
            ] as const).map(item => (
              <span key={item.key} className="flex items-center gap-1.5">
                {item.type === 'square'
                  ? <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block', flexShrink: 0 }} />
                  : <span style={{ width: 18, height: 2, background: item.color, display: 'inline-block', flexShrink: 0 }} />
                }
                {item.label}
              </span>
            ))}
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={pnlChartData} margin={{ top: 4, right: 8, left: -4, bottom: 20 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#888780' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                label={{ value: String(CHART_YEAR), position: 'insideBottom', offset: -10, fontSize: 12, fill: '#6b7280', fontWeight: 600 }}
              />
              <YAxis
                tickFormatter={fmtTick}
                tick={{ fontSize: 11, fill: '#888780' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<PnLTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
              <Bar dataKey="rev_active"    stackId="rev" fill={PNL.active}       isAnimationActive={false} />
              <Bar dataKey="rev_oos"       stackId="rev" fill={PNL.oos}          isAnimationActive={false} />
              <Bar dataKey="rev_demo"      stackId="rev" fill={PNL.demo}         isAnimationActive={false} />
              <Bar dataKey="interest"      stackId="exp" fill={PNL.interest}     isAnimationActive={false} />
              <Bar dataKey="depreciation"  stackId="exp" fill={PNL.depreciation} isAnimationActive={false} />
              <Line
                dataKey="profit"
                stroke={PNL.profit}
                strokeWidth={2}
                dot={{ r: 3, fill: PNL.profit, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                type="monotone"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </KPICard>

      </div>

      {/* ── Row 3: Total Monthly Tax (left) + Upcoming Expirations (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <KPICard title="Total Monthly Tax" subtitle="Sum of all numeric monthly tax values">
          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {totalMonthlyTax.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-gray-400 mb-1.5">/ month</span>
            </div>
            {taxExcludedValues.length > 0 && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-2">Excluded values:</p>
                <div className="flex flex-wrap gap-1.5">
                  {taxExcludedValues.map((v) => (
                    <span key={v} className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </KPICard>

        <KPICard title="Upcoming Lease Expirations" subtitle="Active leases ending within 90 days">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={upcomingData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {noEndDateCount > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600 text-center">
              {noEndDateCount} vehicle{noEndDateCount !== 1 ? 's have' : ' has'} no Lease End date
            </p>
          )}
        </KPICard>

      </div>

      {/* ── Row 4: OOS by Company (left) + Active Leases by Customer Type (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <KPICard
          title="Out of Service by Company"
          subtitle={`${byCompanyData.length} compan${byCompanyData.length === 1 ? 'y' : 'ies'}`}
        >
          {byCompanyData.length === 0 ? (
            <p className="text-xs text-gray-400 mt-2">No data available</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={companyChartHeight}>
                <BarChart data={byCompanyData} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {noCompanyCount > 0 && (
                <p className="mt-2 text-xs font-medium text-red-600 text-center">
                  {noCompanyCount} record{noCompanyCount !== 1 ? 's have' : ' has'} no Company
                </p>
              )}
            </>
          )}
        </KPICard>

        <KPICard title="Active Leases by Customer Type" subtitle={`${byTypeData.length} type${byTypeData.length === 1 ? '' : 's'}`}>
          {byTypeData.length === 0 ? (
            <p className="text-xs text-gray-400 mt-2">No data available</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={typeChartHeight}>
                <BarChart data={byTypeData} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {noTypeCount > 0 && (
                <p className="mt-2 text-xs font-medium text-red-600 text-center">
                  {noTypeCount} record{noTypeCount !== 1 ? 's have' : ' has'} no Customer Type
                </p>
              )}
            </>
          )}
        </KPICard>

      </div>

    </div>
  )
}
