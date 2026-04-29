'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { ClipboardList, ChevronDown, ChevronRight, X, Calendar, ChevronLeft } from 'lucide-react'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string
  created_at: string
  user_email: string
  action: string
  resource_id: string | null
  details: Record<string, unknown> | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  'lease.created':              'Lease Created',
  'lease.updated':              'Lease Edited',
  'lease.deleted':              'Lease Deleted',
  'lease.sent_to_docusign':     'Sent to DocuSign',
  'lease.activated':            'Lease Activated',
  'lease.marked_sold':          'Marked as Sold',
  'lease.marked_out_of_service': 'Marked Out of Service',
  'document.uploaded':          'Document Uploaded',
  'document.deleted':           'Document Deleted',
}

const ACTION_COLORS: Record<string, string> = {
  'lease.created':               'bg-blue-500',
  'lease.updated':               'bg-yellow-400',
  'lease.deleted':               'bg-red-500',
  'lease.sent_to_docusign':      'bg-purple-500',
  'lease.activated':             'bg-green-500',
  'lease.marked_sold':           'bg-teal-500',
  'lease.marked_out_of_service': 'bg-slate-500',
  'document.uploaded':           'bg-amber-500',
  'document.deleted':            'bg-orange-500',
}

const ACTION_BADGE: Record<string, string> = {
  'lease.created':               'bg-blue-50 text-blue-700 ring-blue-200',
  'lease.updated':               'bg-yellow-50 text-yellow-700 ring-yellow-200',
  'lease.deleted':               'bg-red-50 text-red-700 ring-red-200',
  'lease.sent_to_docusign':      'bg-purple-50 text-purple-700 ring-purple-200',
  'lease.activated':             'bg-green-50 text-green-700 ring-green-200',
  'lease.marked_sold':           'bg-teal-50 text-teal-700 ring-teal-200',
  'lease.marked_out_of_service': 'bg-slate-50 text-slate-700 ring-slate-200',
  'document.uploaded':           'bg-amber-50 text-amber-700 ring-amber-200',
  'document.deleted':            'bg-orange-50 text-orange-700 ring-orange-200',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function fmtDateLabel(iso: string) {
  const d         = new Date(iso)
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (same(d, today))     return 'Today'
  if (same(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function dayKey(iso: string) { return iso.slice(0, 10) }

function buildSummary(action: string, details: Record<string, unknown> | null): string {
  if (!details) return ''
  if (action === 'lease.created') {
    const parts: string[] = []
    if (details.vehicle) parts.push(String(details.vehicle))
    if (details.lessee)  parts.push(`Lessee: ${details.lessee}`)
    return parts.join(' · ')
  }
  if (action === 'lease.updated') {
    const changes = details.changes as Record<string, unknown> | undefined
    if (changes) {
      const fields = Object.keys(changes)
      return fields.length === 1 ? `${fields[0]} changed` : `${fields.length} fields changed`
    }
  }
  if (action === 'lease.deleted') {
    const snap = details.snapshot as Record<string, unknown> | undefined
    if (snap?.lessee_name) return `Lessee: ${snap.lessee_name}`
  }
  if (action === 'lease.sent_to_docusign') {
    return [
      details.envelope_id ? `Envelope: ${details.envelope_id}` : '',
      Array.isArray(details.signers) ? `Signers: ${details.signers.join(', ')}` : '',
    ].filter(Boolean).join(' · ')
  }
  if (action === 'lease.activated') {
    const count = details.count as number | undefined
    return count !== undefined ? `${count} lease${count !== 1 ? 's' : ''} activated` : ''
  }
  if (action === 'lease.marked_sold' || action === 'lease.marked_out_of_service') {
    const leases = details.leases as Array<Record<string, unknown>> | undefined
    if (leases && leases.length > 0) {
      const names = leases.map((l) => l.customer_name ?? l.vehicle ?? l.id).filter(Boolean)
      return names.length === 1 ? String(names[0]) : `${names.length} leases`
    }
  }
  if (action === 'document.uploaded' || action === 'document.deleted') {
    return details.file_name ? String(details.file_name) : ''
  }
  return ''
}

// ─── Calendar month ───────────────────────────────────────────────────────────

function CalendarMonth({
  year, month, selectedStart, selectedEnd, onSelectDay,
}: {
  year: number; month: number
  selectedStart: Date | null; selectedEnd: Date | null
  onSelectDay: (d: Date) => void
}) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const inRange = (day: number) => {
    if (!selectedStart || !selectedEnd) return false
    const d = new Date(year, month, day)
    return d > selectedStart && d < selectedEnd
  }
  const isStart = (day: number) => {
    if (!selectedStart) return false
    return new Date(year, month, day).toDateString() === selectedStart.toDateString()
  }
  const isEnd = (day: number) => {
    if (!selectedEnd) return false
    return new Date(year, month, day).toDateString() === selectedEnd.toDateString()
  }

  return (
    <div className="w-[200px]">
      <p className="text-center text-sm font-semibold text-gray-800 mb-3">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <span key={d} className="text-center text-[11px] font-medium text-gray-400">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />
          const start   = isStart(day)
          const end     = isEnd(day)
          const between = inRange(day)
          return (
            <button
              key={i}
              onClick={() => onSelectDay(new Date(year, month, day))}
              className={clsx(
                'h-7 w-7 mx-auto flex items-center justify-center text-xs transition-colors',
                !start && !end && !between && 'hover:bg-gray-100 text-gray-700 rounded-full',
                between && 'bg-blue-50 text-blue-700',
                (start || end) && 'bg-blue-600 text-white rounded-full',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Date range picker ────────────────────────────────────────────────────────

type Preset = 'today' | 'last7' | 'last30' | 'custom' | null

function DateRangePicker({
  from, to, onApply, onCancel,
}: {
  from: Date | null; to: Date | null
  onApply: (from: Date | null, to: Date | null) => void
  onCancel: () => void
}) {
  const today = new Date()
  const [localFrom,    setLocalFrom]    = useState<Date | null>(from)
  const [localTo,      setLocalTo]      = useState<Date | null>(to)
  const [preset,       setPreset]       = useState<Preset>(null)
  const [isPickingEnd, setIsPickingEnd] = useState(false)
  const [leftYear,     setLeftYear]     = useState(today.getFullYear())
  const [leftMonth,    setLeftMonth]    = useState(today.getMonth())

  const rightMonth = leftMonth === 11 ? 0           : leftMonth + 1
  const rightYear  = leftMonth === 11 ? leftYear + 1 : leftYear

  function applyPreset(p: Preset) {
    setPreset(p)
    const now = new Date()
    if (p === 'today') {
      setLocalFrom(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      setLocalTo(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59))
    } else if (p === 'last7') {
      const start = new Date(now); start.setDate(now.getDate() - 6)
      setLocalFrom(start); setLocalTo(now)
    } else if (p === 'last30') {
      const start = new Date(now); start.setDate(now.getDate() - 29)
      setLocalFrom(start); setLocalTo(now)
    } else if (p === 'custom') {
      setLocalFrom(null); setLocalTo(null); setIsPickingEnd(false)
    } else {
      setLocalFrom(null); setLocalTo(null)
    }
  }

  function handleDayClick(d: Date) {
    if (!isPickingEnd) {
      setLocalFrom(d); setLocalTo(null); setIsPickingEnd(true)
    } else {
      if (localFrom && d < localFrom) {
        setLocalFrom(d); setLocalTo(null); setIsPickingEnd(true)
      } else {
        setLocalTo(d); setIsPickingEnd(false)
      }
    }
    setPreset('custom')
  }

  function prevMonth() {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYear((y) => y - 1) }
    else setLeftMonth((m) => m - 1)
  }
  function nextMonth() {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYear((y) => y + 1) }
    else setLeftMonth((m) => m + 1)
  }

  const fmtInput = (d: Date | null) =>
    d ? d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''

  return (
    // Opens LEFT-anchored so it never bleeds into the sidebar
    <div className="absolute z-50 top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-5 flex gap-6">
      {/* Calendars + inputs */}
      <div>
        <div className="flex gap-4 mb-4">
          {(['From', 'To'] as const).map((label, idx) => {
            const val = idx === 0 ? localFrom : localTo
            return (
              <div key={label} className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 bg-gray-50 min-w-[130px]">
                  <span className="flex-1">{fmtInput(val) || 'MM/DD/YYYY'}</span>
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-start gap-3">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded mt-6">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <CalendarMonth
            year={leftYear} month={leftMonth}
            selectedStart={localFrom} selectedEnd={localTo}
            onSelectDay={handleDayClick}
          />
          <CalendarMonth
            year={rightYear} month={rightMonth}
            selectedStart={localFrom} selectedEnd={localTo}
            onSelectDay={handleDayClick}
          />
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded mt-6">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(localFrom, localTo)}
            className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-col gap-1 min-w-[130px] pt-7">
        {([
          { key: 'today',  label: 'Today' },
          { key: 'last7',  label: 'Last 7 Day(s)' },
          { key: 'last30', label: 'Last 30 Day(s)' },
          { key: 'custom', label: 'Custom' },
        ] as { key: Preset; label: string }[]).map(({ key, label }) => (
          <button
            key={key!}
            onClick={() => applyPreset(key)}
            className={clsx(
              'text-left text-sm px-3 py-1.5 rounded-lg transition-colors',
              preset === key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => applyPreset(null)}
          className="text-left text-sm px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// ─── Details panel ────────────────────────────────────────────────────────────

function DetailsPanel({ action, details }: { action: string; details: Record<string, unknown> | null }) {
  if (!details) return <p className="text-xs text-gray-400 italic">No details recorded.</p>

  if (action === 'lease.updated' && details.changes) {
    const changes = details.changes as Record<string, { before: unknown; after: unknown }>
    return (
      <div className="space-y-1">
        {Object.entries(changes).map(([field, { before, after }]) => (
          <div key={field} className="text-xs flex items-start gap-2">
            <span className="font-medium text-gray-600 min-w-[140px] shrink-0">{field}</span>
            <span className="text-gray-400 line-through">{String(before ?? '—')}</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-800">{String(after ?? '—')}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {Object.entries(details).map(([k, v]) => (
        <div key={k} className="text-xs flex gap-2">
          <span className="font-medium text-gray-500 min-w-[120px] shrink-0">{k}</span>
          <span className="text-gray-700 break-all">
            {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── User dropdown filter ─────────────────────────────────────────────────────

function UserFilter({ users, value, onChange }: {
  users: string[]; value: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = value === 'all' ? 'All Users' : value

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          open || value !== 'all'
            ? 'border-brand-500 bg-white text-gray-900 shadow-sm'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
        )}
      >
        <span className="max-w-[180px] truncate">{label}</span>
        {value !== 'all' && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white leading-none">
            1
          </span>
        )}
        <ChevronDown size={13} className={clsx('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {(['all', ...users] as string[]).map((u) => (
            <button
              key={u}
              onClick={() => { onChange(u); setOpen(false) }}
              className={clsx(
                'w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors',
                value === u ? 'text-brand-700 font-medium' : 'text-gray-700',
              )}
            >
              {u === 'all' ? 'All Users' : u}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [logs,       setLogs]       = useState<AuditLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())
  const [filterUser, setFilterUser] = useState<string>('all')
  const [dateFrom,   setDateFrom]   = useState<Date | null>(null)
  const [dateTo,     setDateTo]     = useState<Date | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/audit-logs')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLogs(data as AuditLog[])
        setLoading(false)
      })
      .catch((err) => { console.error('audit-logs fetch failed:', err); setLoading(false) })
  }, [])

  // Close date picker on outside click
  useEffect(() => {
    if (!showPicker) return
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  const users = useMemo(
    () => Array.from(new Set(logs.map((l) => l.user_email))).sort(),
    [logs],
  )

  const filtered = useMemo(() => logs.filter((l) => {
    if (filterUser !== 'all' && l.user_email !== filterUser) return false
    if (dateFrom && new Date(l.created_at) < dateFrom) return false
    if (dateTo   && new Date(l.created_at) > dateTo)   return false
    return true
  }), [logs, filterUser, dateFrom, dateTo])

  const grouped = useMemo(() => {
    const map = new Map<string, AuditLog[]>()
    for (const log of filtered) {
      const key = dayKey(log.created_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(log)
    }
    return Array.from(map.entries())
  }, [filtered])

  function toggleExpand(id: string) {
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function clearFilters() { setFilterUser('all'); setDateFrom(null); setDateTo(null) }

  const hasFilters = filterUser !== 'all' || dateFrom !== null || dateTo !== null

  function dateRangeLabel() {
    if (!dateFrom && !dateTo) return 'Date Range'
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`
    if (dateFrom) return `From ${fmt(dateFrom)}`
    return `To ${fmt(dateTo!)}`
  }

  return (
    <div className="px-8 py-5 bg-white min-h-screen">

      {/* ── Page header — matches all other portal pages ── */}
      <div className="pb-4 mb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Track changes, actions, and events across the portal.
        </p>
      </div>

      {/* ── Filter bar — matches VehiclesOnOrder / CurrentLeases style ── */}
      <div className="flex flex-wrap items-center gap-[17px] mb-6">

        <UserFilter users={users} value={filterUser} onChange={setFilterUser} />

        {/* Date range filter */}
        <div ref={pickerRef} className="relative">
          <button
            type="button"
            onClick={() => setShowPicker((p) => !p)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              showPicker || dateFrom || dateTo
                ? 'border-brand-500 bg-white text-gray-900 shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
            )}
          >
            <Calendar size={14} className="text-gray-400" />
            <span>{dateRangeLabel()}</span>
            {(dateFrom || dateTo) && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white leading-none">
                1
              </span>
            )}
            <ChevronDown size={13} className={clsx('text-gray-400 transition-transform', showPicker && 'rotate-180')} />
          </button>

          {showPicker && (
            <DateRangePicker
              from={dateFrom} to={dateTo}
              onApply={(f, t) => { setDateFrom(f); setDateTo(t); setShowPicker(false) }}
              onCancel={() => setShowPicker(false)}
            />
          )}
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-400 transition-colors"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading…</div>
      ) : logs.length === 0 ? (
        /* Empty — no logs at all */
        <div className="rounded-xl border border-gray-200 flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
            <ClipboardList size={24} className="text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">No activity yet</h2>
          <p className="text-sm text-gray-400 max-w-sm">
            Actions taken in the portal will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty — filters active, no matches */
        <div className="rounded-xl border border-gray-200 flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
            <ClipboardList size={24} className="text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">No events found</h2>
          <p className="text-sm text-gray-400 max-w-sm mb-3">
            Try adjusting the date range or user filter.
          </p>
          <button onClick={clearFilters} className="text-sm text-brand-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        /* Timeline */
        <div>
          {grouped.map(([dateKey, entries]) => (
            <div key={dateKey} className="mb-6">

              {/* Date divider */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {fmtDateLabel(entries[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Events */}
              <div className="relative ml-3">
                <div className="absolute left-[9px] top-0 bottom-0 w-px bg-gray-100" />

                {entries.map((log) => {
                  const dotColor = ACTION_COLORS[log.action] ?? 'bg-gray-400'
                  const badge    = ACTION_BADGE[log.action]  ?? 'bg-gray-50 text-gray-600 ring-gray-200'
                  const label    = ACTION_LABELS[log.action] ?? log.action
                  const summary  = buildSummary(log.action, log.details)
                  const isOpen   = expanded.has(log.id)

                  return (
                    <div key={log.id} className="relative pl-8 pb-5">
                      <span className={clsx(
                        'absolute left-0 top-1 h-[18px] w-[18px] rounded-full border-2 border-white shadow-sm',
                        dotColor,
                      )} />

                      <div
                        className="group cursor-pointer rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 px-4 py-3 transition-colors"
                        onClick={() => toggleExpand(log.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full ring-1', badge)}>
                              {label}
                            </span>
                            <span className="text-xs text-gray-400">{fmtTimestamp(log.created_at)}</span>
                          </div>
                          {isOpen
                            ? <ChevronDown size={15} className="text-gray-400 mt-0.5 shrink-0" />
                            : <ChevronRight size={15} className="text-gray-400 mt-0.5 shrink-0" />
                          }
                        </div>

                        <p className="text-xs text-gray-500 mt-1">{log.user_email}</p>
                        {summary && <p className="text-xs text-gray-600 mt-0.5">{summary}</p>}

                        {isOpen && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            {log.resource_id && (
                              <p className="text-xs text-gray-400 mb-2">
                                ID: <span className="font-mono text-gray-600">{log.resource_id}</span>
                              </p>
                            )}
                            <DetailsPanel action={log.action} details={log.details} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
