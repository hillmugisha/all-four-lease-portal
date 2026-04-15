'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { VehicleOnOrderRecord } from '@/lib/vehicles-on-order-types'
import { Eye, RefreshCw, X, Search, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import { DR, MS } from '@/lib/table-utils'

const PAGE_SIZE = 100

// ─── SHAED Status badge ───────────────────────────────────────────────────────

const SHAED_STYLES: Record<string, string> = {
  'OEM Tracking Not Required': 'bg-gray-100 text-gray-600',
  'OEM Delivered':             'bg-green-50 text-green-700',
  'TBD':                       'bg-amber-50 text-amber-700',
  'Upfit Completed':           'bg-blue-50 text-blue-700',
  'OEM Cancelled':             'bg-red-50 text-red-700',
  'In Order Processing':       'bg-purple-50 text-purple-700',
  'Scheduled':                 'bg-indigo-50 text-indigo-700',
  'In Transit':                'bg-orange-50 text-orange-700',
  'In Production':             'bg-teal-50 text-teal-700',
}

function ShaedBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">—</span>
  const style = SHAED_STYLES[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={clsx('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap', style)}>
      {status}
    </span>
  )
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function VehicleDetailModal({ vehicle, onClose }: { vehicle: VehicleOnOrderRecord; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-gray-50 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {vehicle.stock_number ?? '—'} &nbsp;·&nbsp; {[vehicle.model_year, vehicle.oem, vehicle.vehicle_line].filter(Boolean).join(' ')}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {vehicle.customer_name ?? 'No customer'}{vehicle.vin ? <> &nbsp;·&nbsp; <span className="font-mono">{vehicle.vin}</span></> : null}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <ShaedBadge status={vehicle.shaed_status} />
            <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-1">
          <MS title="Order Info">
            <DR label="Stock #"               value={vehicle.stock_number} />
            <DR label="Inventory Type"        value={vehicle.inventory_type} />
            <DR label="Stage"                 value={vehicle.stage} />
            <DR label="OEM"                   value={vehicle.oem} />
            <DR label="OEM Order #"           value={vehicle.oem_order_number} />
            <DR label="Order Date"            value={vehicle.order_date} />
            <DR label="Tracking Type"         value={vehicle.tracking_type} />
          </MS>

          <MS title="Vehicle">
            <DR label="Model Year"            value={vehicle.model_year} />
            <DR label="Vehicle Line"          value={vehicle.vehicle_line} />
            <DR label="Body Code"             value={vehicle.body_code} />
            <DR label="Color"                 value={vehicle.color} />
            <DR label="VIN"                   value={vehicle.vin} />
            <DR label="Ship to Location"      value={vehicle.ship_to_location} />
          </MS>

          <MS title="Production & Delivery">
            <DR label="Target Production Wk"  value={vehicle.target_production_week} />
            <DR label="OEM Status"            value={vehicle.oem_status} />
            <DR label="Chassis ETA"           value={vehicle.chassis_eta} />
            <DR label="Expected Delivery"     value={vehicle.expected_delivery_date} />
          </MS>

          <MS title="Customer / PO">
            <DR label="Customer Name"         value={vehicle.customer_name} />
            <DR label="Sales Person"          value={vehicle.sales_person} />
            <DR label="Customer PO #"         value={vehicle.customer_po_number} />
            <DR label="Customer PO Date"      value={vehicle.customer_po_date} />
          </MS>

          <MS title="Invoice">
            <DR label="Customer Invoice #"    value={vehicle.customer_invoice_number} />
            <DR label="Invoice Amount"        value={vehicle.invoice_amount} />
            <DR label="Invoice Date"          value={vehicle.invoice_date} />
            <DR label="Invoice Due Date"      value={vehicle.invoice_due_date} />
            <DR label="Payment Date"          value={vehicle.payment_date} />
          </MS>

          <MS title="Upfit">
            <DR label="Upfitter Name"                   value={vehicle.upfitter_name} />
            <DR label="Date Received at Upfitter"       value={vehicle.date_received_at_upfitter} />
            <DR label="Upfit Status"                    value={vehicle.upfit_status} />
            <DR label="Est. Upfit Completion"           value={vehicle.estimated_upfit_completion_date} />
            <DR label="Actual Upfit Completion"         value={vehicle.actual_upfit_completion_date} />
          </MS>

          <MS title="Logistics">
            <DR label="Logistics Status"      value={vehicle.logistics_status} />
            <DR label="SHAED Status"          value={vehicle.shaed_status} />
          </MS>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
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
      <span
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-400 transition-colors"
        style={{ touchAction: 'none' }}
      />
    </th>
  )
}

// ─── Column definitions ───────────────────────────────────────────────────────

type ColKey =
  | 'stock_number' | 'oem' | 'oem_order_number' | 'shaed_status' | 'oem_status'
  | 'model_year' | 'vin' | 'vehicle_line' | 'chassis_eta'
  | 'customer_name' | 'sales_person' | 'body_code' | 'customer_po_number'
  | 'customer_po_date' | 'tracking_type' | 'order_date' | 'color'
  | 'ship_to_location' | 'target_production_week' | 'customer_invoice_number'
  | 'invoice_amount' | 'invoice_date' | 'invoice_due_date' | 'payment_date'
  | 'upfitter_name' | 'date_received_at_upfitter' | 'upfit_status'
  | 'estimated_upfit_completion_date' | 'actual_upfit_completion_date'
  | 'logistics_status' | 'expected_delivery_date' | 'stage' | 'inventory_type'

interface ColDef {
  key:     ColKey
  label:   string
  default: boolean
  width:   number
}

const COLUMNS: ColDef[] = [
  // ── Default visible ──
  { key: 'stock_number',    label: 'Stock #',       default: true,  width: 130 },
  { key: 'oem',             label: 'OEM',           default: true,  width: 100 },
  { key: 'oem_order_number',label: 'OEM Order #',   default: true,  width: 130 },
  { key: 'shaed_status',    label: 'SHAED Status',  default: true,  width: 180 },
  { key: 'oem_status',      label: 'OEM Status',    default: true,  width: 180 },
  { key: 'model_year',      label: 'Model Year',    default: true,  width: 100 },
  { key: 'vin',             label: 'VIN',           default: true,  width: 170 },
  { key: 'vehicle_line',    label: 'Vehicle Line',  default: true,  width: 220 },
  { key: 'chassis_eta',     label: 'Chassis ETA',   default: true,  width: 120 },
  // ── Hidden by default ──
  { key: 'customer_name',                   label: 'Customer Name',                   default: false, width: 160 },
  { key: 'sales_person',                    label: 'Sales Person',                    default: false, width: 140 },
  { key: 'body_code',                       label: 'Body Code',                       default: false, width: 110 },
  { key: 'customer_po_number',              label: 'Customer PO #',                   default: false, width: 130 },
  { key: 'customer_po_date',                label: 'Customer PO Date',                default: false, width: 140 },
  { key: 'tracking_type',                   label: 'Tracking Type',                   default: false, width: 130 },
  { key: 'order_date',                      label: 'Order Date',                      default: false, width: 120 },
  { key: 'color',                           label: 'Color',                           default: false, width: 180 },
  { key: 'ship_to_location',                label: 'Ship To Location',                default: false, width: 260 },
  { key: 'target_production_week',          label: 'Target Production Wk',           default: false, width: 160 },
  { key: 'customer_invoice_number',         label: 'Customer Invoice #',             default: false, width: 150 },
  { key: 'invoice_amount',                  label: 'Invoice Amount',                  default: false, width: 130 },
  { key: 'invoice_date',                    label: 'Invoice Date',                    default: false, width: 120 },
  { key: 'invoice_due_date',               label: 'Invoice Due Date',                default: false, width: 130 },
  { key: 'payment_date',                    label: 'Payment Date',                    default: false, width: 120 },
  { key: 'upfitter_name',                   label: 'Upfitter Name',                   default: false, width: 150 },
  { key: 'date_received_at_upfitter',       label: 'Rcvd at Upfitter',               default: false, width: 140 },
  { key: 'upfit_status',                    label: 'Upfit Status',                    default: false, width: 130 },
  { key: 'estimated_upfit_completion_date', label: 'Est. Upfit Completion',           default: false, width: 160 },
  { key: 'actual_upfit_completion_date',    label: 'Actual Upfit Completion',         default: false, width: 160 },
  { key: 'logistics_status',                label: 'Logistics Status',                default: false, width: 140 },
  { key: 'expected_delivery_date',          label: 'Expected Delivery',               default: false, width: 140 },
  { key: 'stage',                           label: 'Stage',                           default: false, width: 100 },
  { key: 'inventory_type',                  label: 'Inventory Type',                  default: false, width: 120 },
]

const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.width])) as Record<ColKey, number>

// ─── Filters ──────────────────────────────────────────────────────────────────

interface Filters {
  search:        string
  inventoryType: string
  stage:         string
  shaedStatus:   string
  customerName:  string
}

const EMPTY_FILTERS: Filters = {
  search: '', inventoryType: '', stage: '', shaedStatus: '', customerName: '',
}

function FilterSelect({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string
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

// ─── Excel export ─────────────────────────────────────────────────────────────

function exportToExcel(records: VehicleOnOrderRecord[]) {
  const rows = records.map((v) => ({
    'Stock #':                       v.stock_number ?? '',
    'Customer Name':                 v.customer_name ?? '',
    'Sales Person':                  v.sales_person ?? '',
    'OEM':                           v.oem ?? '',
    'OEM Order #':                   v.oem_order_number ?? '',
    'Model Year':                    v.model_year ?? '',
    'Body Code':                     v.body_code ?? '',
    'VIN':                           v.vin ?? '',
    'Customer PO #':                 v.customer_po_number ?? '',
    'Customer PO Date':              v.customer_po_date ?? '',
    'Tracking Type':                 v.tracking_type ?? '',
    'Order Date':                    v.order_date ?? '',
    'Vehicle Line':                  v.vehicle_line ?? '',
    'Color':                         v.color ?? '',
    'Ship To Location':              v.ship_to_location ?? '',
    'Target Production Week':        v.target_production_week ?? '',
    'OEM Status':                    v.oem_status ?? '',
    'Chassis ETA':                   v.chassis_eta ?? '',
    'SHAED Status':                  v.shaed_status ?? '',
    'Customer Invoice #':            v.customer_invoice_number ?? '',
    'Invoice Amount':                v.invoice_amount ?? '',
    'Invoice Date':                  v.invoice_date ?? '',
    'Invoice Due Date':              v.invoice_due_date ?? '',
    'Payment Date':                  v.payment_date ?? '',
    'Upfitter Name':                 v.upfitter_name ?? '',
    'Date Received at Upfitter':     v.date_received_at_upfitter ?? '',
    'Upfit Status':                  v.upfit_status ?? '',
    'Est. Upfit Completion Date':    v.estimated_upfit_completion_date ?? '',
    'Actual Upfit Completion Date':  v.actual_upfit_completion_date ?? '',
    'Logistics Status':              v.logistics_status ?? '',
    'Expected Delivery Date':        v.expected_delivery_date ?? '',
    'Stage':                         v.stage ?? '',
    'Inventory Type':                v.inventory_type ?? '',
  }))
  const ws  = XLSX.utils.json_to_sheet(rows)
  const wb  = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Vehicles on Order')
  XLSX.writeFile(wb, 'vehicles-on-order.xlsx')
}

// ─── Cell renderer ────────────────────────────────────────────────────────────

function Cell({ col, vehicle }: { col: ColKey; vehicle: VehicleOnOrderRecord }) {
  const v = vehicle[col]
  if (col === 'shaed_status') return <ShaedBadge status={v} />
  return <span className={clsx(col === 'vin' && 'font-mono text-xs')}>{v ?? '—'}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VehiclesOnOrderTable({
  vehicles,
  loading,
  onRefresh,
}: {
  vehicles: VehicleOnOrderRecord[]
  loading:  boolean
  onRefresh: () => void
}) {
  const [filters, setFilters]         = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage]               = useState(1)
  const [selected, setSelected]       = useState<VehicleOnOrderRecord | null>(null)
  const [colWidths, setColWidths]     = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(COLUMNS.filter((c) => c.default).map((c) => c.key))
  )
  const [eyeOpen, setEyeOpen] = useState(false)
  const eyeRef = useRef<HTMLDivElement>(null)

  // Close eye dropdown on outside click
  const handleEyeBlur = useCallback((e: React.FocusEvent) => {
    if (!eyeRef.current?.contains(e.relatedTarget as Node)) setEyeOpen(false)
  }, [])

  // Unique filter options derived from data
  const inventoryTypes = useMemo(() => [...new Set(vehicles.map((v) => v.inventory_type).filter(Boolean))].sort() as string[], [vehicles])
  const stages         = useMemo(() => [...new Set(vehicles.map((v) => v.stage).filter(Boolean))].sort() as string[], [vehicles])
  const shaedStatuses  = useMemo(() => [...new Set(vehicles.map((v) => v.shaed_status).filter(Boolean))].sort() as string[], [vehicles])
  const customerNames  = useMemo(() => [...new Set(vehicles.map((v) => v.customer_name).filter(Boolean))].sort() as string[], [vehicles])

  // Apply filters
  const filtered = useMemo(() => {
    const { search, inventoryType, stage, shaedStatus, customerName } = filters
    const q = search.toLowerCase()
    return vehicles.filter((v) => {
      if (inventoryType && v.inventory_type !== inventoryType) return false
      if (stage        && v.stage          !== stage)         return false
      if (shaedStatus  && v.shaed_status   !== shaedStatus)   return false
      if (customerName && v.customer_name  !== customerName)  return false
      if (q) {
        const hay = [
          v.stock_number, v.oem, v.oem_order_number, v.vin,
          v.vehicle_line, v.customer_name, v.oem_status, v.chassis_eta,
        ].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [vehicles, filters])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const hasFilters = Object.values(filters).some(Boolean)

  function resize(key: ColKey, delta: number) {
    setColWidths((prev) => ({ ...prev, [key]: Math.max(60, (prev[key] ?? 120) + delta) }))
  }

  function toggleCol(key: ColKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const visibleDefs = COLUMNS.filter((c) => visibleCols.has(c.key))

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-end gap-3">

        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Stock #, VIN, OEM, vehicle line…"
              value={filters.search}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1) }}
              className="input pl-7 py-1.5 text-sm w-full"
            />
          </div>
        </div>

        {/* Inventory Type */}
        <FilterSelect
          label="Inventory Type"
          value={filters.inventoryType}
          onChange={(v) => { setFilters((f) => ({ ...f, inventoryType: v })); setPage(1) }}
          options={inventoryTypes}
          placeholder="All types"
        />

        {/* Stage */}
        <FilterSelect
          label="Stage"
          value={filters.stage}
          onChange={(v) => { setFilters((f) => ({ ...f, stage: v })); setPage(1) }}
          options={stages}
          placeholder="All stages"
        />

        {/* Customer Name */}
        <FilterSelect
          label="Customer Name"
          value={filters.customerName}
          onChange={(v) => { setFilters((f) => ({ ...f, customerName: v })); setPage(1) }}
          options={customerNames}
          placeholder="All customers"
        />

        {/* SHAED Status */}
        <div className="min-w-[170px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">SHAED Status</label>
          <div className="relative">
            <select
              value={filters.shaedStatus}
              onChange={(e) => { setFilters((f) => ({ ...f, shaedStatus: e.target.value })); setPage(1) }}
              className="input py-1.5 text-sm appearance-none pr-7 w-full"
            >
              <option value="">All statuses</option>
              {shaedStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <div className="self-end">
            <button onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }} className="btn-secondary py-1.5 text-xs">
              <X size={12} /> Clear
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Column visibility */}
        <div className="self-end relative" ref={eyeRef} onBlur={handleEyeBlur} tabIndex={-1}>
          <button
            onClick={() => setEyeOpen((o) => !o)}
            className="btn-secondary py-1.5 text-xs flex items-center gap-1.5"
          >
            <Eye size={14} /> Columns
          </button>
          {eyeOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-3 max-h-80 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Toggle Columns</p>
              {COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.key)}
                    onChange={() => toggleCol(col.key)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="self-end">
          <button onClick={() => exportToExcel(filtered)} className="btn-secondary py-1.5 text-xs flex items-center gap-1.5">
            <Download size={14} /> Export
          </button>
        </div>

        {/* Refresh */}
        <div className="self-end">
          <button onClick={onRefresh} className="btn-secondary py-1.5 text-xs flex items-center gap-1.5" disabled={loading}>
            <RefreshCw size={14} className={clsx(loading && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Results summary ── */}
      <p className="text-xs text-gray-500">
        Showing {filtered.length.toLocaleString()} of {vehicles.length.toLocaleString()} vehicles
        {hasFilters && <> &nbsp;·&nbsp; <button className="text-brand-600 hover:underline" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button></>}
      </p>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th className="w-10 border-r border-gray-200 bg-gray-50 px-3 py-2.5" />
              {visibleDefs.map((col) => (
                <ResizableTh
                  key={col.key}
                  width={colWidths[col.key]}
                  onResize={(d) => resize(col.key, d)}
                >
                  {col.label}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2.5" />
                  {visibleDefs.map((col) => (
                    <td key={col.key} className="px-3 py-2.5">
                      <div className="h-3 rounded bg-gray-100 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={visibleDefs.length + 1} className="px-6 py-12 text-center text-sm text-gray-400">
                  No vehicles match the current filters.
                </td>
              </tr>
            ) : (
              paginated.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => setSelected(vehicle)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                      title="View details"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                  {visibleDefs.map((col) => (
                    <td
                      key={col.key}
                      className="overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2.5 text-gray-700"
                      style={{ maxWidth: colWidths[col.key] }}
                      title={vehicle[col.key] ?? undefined}
                    >
                      <Cell col={col.key} vehicle={vehicle} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      {selected && (
        <VehicleDetailModal vehicle={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
