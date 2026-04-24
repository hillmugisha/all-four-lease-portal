'use client'

import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { usePersistedColumns } from '@/lib/usePersistedColumns'
import { useRouter } from 'next/navigation'
import { VehicleOnOrderRecord } from '@/lib/vehicles-on-order-types'
import { Columns, X, Search, ChevronDown, ChevronLeft, ChevronRight, Eye, FilePlus, PlusCircle } from 'lucide-react'
import OrganizeColumnsModal from '@/components/OrganizeColumnsModal'
import VehiclesOnOrderKPIs from '@/components/VehiclesOnOrderKPIs'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import { DR, MS } from '@/lib/table-utils'

const PAGE_SIZE = 50

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

  function handleMouseDown(e: React.MouseEvent) {
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
  }

  return (
    <th
      style={{ width, minWidth: 60, position: 'relative' }}
      className={clsx(
        'select-none border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900',
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
  { key: 'target_production_week',          label: 'Target Production Wk',            default: false, width: 160 },
  { key: 'customer_invoice_number',         label: 'Customer Invoice #',              default: false, width: 150 },
  { key: 'invoice_amount',                  label: 'Invoice Amount',                  default: false, width: 130 },
  { key: 'invoice_date',                    label: 'Invoice Date',                    default: false, width: 120 },
  { key: 'invoice_due_date',               label: 'Invoice Due Date',                 default: false, width: 130 },
  { key: 'payment_date',                    label: 'Payment Date',                    default: false, width: 120 },
  { key: 'upfitter_name',                   label: 'Upfitter Name',                   default: false, width: 150 },
  { key: 'date_received_at_upfitter',       label: 'Rcvd at Upfitter',                default: false, width: 140 },
  { key: 'upfit_status',                    label: 'Upfit Status',                    default: false, width: 130 },
  { key: 'estimated_upfit_completion_date', label: 'Est. Upfit Completion',            default: false, width: 160 },
  { key: 'actual_upfit_completion_date',    label: 'Actual Upfit Completion',          default: false, width: 160 },
  { key: 'logistics_status',                label: 'Logistics Status',                 default: false, width: 140 },
  { key: 'expected_delivery_date',          label: 'Expected Delivery',                default: false, width: 140 },
  { key: 'stage',                           label: 'Stage',                            default: false, width: 100 },
  { key: 'inventory_type',                  label: 'Inventory Type',                   default: false, width: 120 },
]

const DEFAULT_COLS: ColKey[]                  = COLUMNS.filter((c) => c.default).map((c) => c.key)
const DEFAULT_WIDTHS: Record<ColKey, number>  = Object.fromEntries(COLUMNS.map((c) => [c.key, c.width])) as Record<ColKey, number>

// ─── Filters ──────────────────────────────────────────────────────────────────

interface Filters {
  search:        string
  inventoryType: string[]
  stage:         string[]
  year:          string[]
  make:          string[]
  model:         string[]
  shaedStatus:   string[]
}

const EMPTY_FILTERS: Filters = {
  search: '', inventoryType: [], stage: [], year: [], make: [], model: [], shaedStatus: [],
}

function MultiSelectFilter({
  label, selected, onChange, options,
}: {
  label:    string
  selected: string[]
  onChange: (v: string[]) => void
  options:  string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggleOption(opt: string) {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt))
    else onChange([...selected, opt])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          open
            ? 'border-brand-500 bg-white text-gray-900 shadow-sm'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        )}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white leading-none">
            {selected.length}
          </span>
        )}
        <ChevronDown size={13} className={clsx('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => onChange([])}
              className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600"
            />
            <span className="text-sm text-gray-700">All</span>
          </label>
          {options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggleOption(opt)}
                className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600"
              />
              <span className="text-sm text-gray-700 whitespace-nowrap">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function applyFilters(
  vehicles: VehicleOnOrderRecord[],
  f: Filters,
  exclude?: keyof Filters,
): VehicleOnOrderRecord[] {
  const q = exclude === 'search' ? '' : f.search.toLowerCase()
  return vehicles.filter((v) => {
    if (exclude !== 'inventoryType' && f.inventoryType.length > 0 && !f.inventoryType.includes(v.inventory_type ?? '')) return false
    if (exclude !== 'stage'         && f.stage.length > 0         && !f.stage.includes(v.stage ?? ''))                   return false
    if (exclude !== 'year'          && f.year.length > 0          && !f.year.includes(v.model_year ?? ''))                return false
    if (exclude !== 'make'          && f.make.length > 0          && !f.make.includes(v.oem ?? ''))                       return false
    if (exclude !== 'model'         && f.model.length > 0         && !f.model.includes(v.vehicle_line ?? ''))             return false
    if (exclude !== 'shaedStatus'   && f.shaedStatus.length > 0   && !f.shaedStatus.includes(v.shaed_status ?? ''))       return false
    if (q) {
      const hay = [v.stock_number, v.oem, v.oem_order_number, v.vin, v.vehicle_line, v.customer_name, v.oem_status, v.chassis_eta].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

function distinct(arr: VehicleOnOrderRecord[], key: (v: VehicleOnOrderRecord) => string | null): string[] {
  return Array.from(new Set(arr.map(key).filter((x): x is string => x !== null)))
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

// ─── Public handle type ───────────────────────────────────────────────────────

export interface VehiclesOnOrderTableHandle {
  createLease: () => void
}

// ─── Main component ───────────────────────────────────────────────────────────

const VehiclesOnOrderTable = forwardRef<
  VehiclesOnOrderTableHandle,
  {
    vehicles:          VehicleOnOrderRecord[]
    loading:           boolean
    onRefresh:         () => void
    onSelectionChange?: (count: number) => void
  }
>(function VehiclesOnOrderTable({ vehicles, loading, onRefresh: _onRefresh, onSelectionChange }, ref) {
  const router = useRouter()
  const [filters, setFilters]               = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage]                     = useState(1)
  const [selected, setSelected]             = useState<VehicleOnOrderRecord | null>(null)
  const [colWidths, setColWidths]           = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)
  const [visibleCols, setVisibleCols]       = usePersistedColumns('cols:vehicles-on-order', DEFAULT_COLS)
  const [columnsModalOpen, setColumnsModalOpen] = useState(false)
  const [checkedIds, setCheckedIds]         = useState<Set<number>>(new Set())
  const [masterLeaseModalOpen, setMasterLeaseModalOpen] = useState(false)
  const [pendingVehicles, setPendingVehicles] = useState<VehicleOnOrderRecord[]>([])

  const filtered       = useMemo(() => applyFilters(vehicles, filters),                    [vehicles, filters])
  const inventoryTypes = useMemo(() => distinct(applyFilters(vehicles, filters, 'inventoryType'), (v) => v.inventory_type).sort(), [vehicles, filters])
  const stages         = useMemo(() => distinct(applyFilters(vehicles, filters, 'stage'),         (v) => v.stage).sort(),          [vehicles, filters])
  const years          = useMemo(() => distinct(applyFilters(vehicles, filters, 'year'),          (v) => v.model_year).sort((a, b) => b.localeCompare(a)), [vehicles, filters])
  const makes          = useMemo(() => distinct(applyFilters(vehicles, filters, 'make'),          (v) => v.oem).sort(),             [vehicles, filters])
  const models         = useMemo(() => distinct(applyFilters(vehicles, filters, 'model'),         (v) => v.vehicle_line).sort(),    [vehicles, filters])
  const shaedStatuses  = useMemo(() => distinct(applyFilters(vehicles, filters, 'shaedStatus'),   (v) => v.shaed_status).sort(),    [vehicles, filters])

  const hasDropdownFilters = filters.inventoryType.length > 0 || filters.stage.length > 0 || filters.year.length > 0 || filters.make.length > 0 || filters.model.length > 0 || filters.shaedStatus.length > 0

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const pageNumbers = useMemo((): (number | string)[] => {
    const visible = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
    const result: (number | string)[] = []
    visible.forEach((p, idx) => {
      if (idx > 0 && p - (visible[idx - 1]) > 1) result.push('…')
      result.push(p)
    })
    return result
  }, [totalPages, currentPage])

  const allChecked  = filtered.length > 0 && filtered.every((v) => checkedIds.has(v.id))
  const someChecked = filtered.some((v) => checkedIds.has(v.id))

  function toggleAll() {
    setCheckedIds(allChecked ? new Set() : new Set(filtered.map((v) => v.id)))
  }
  function toggleId(id: number) {
    setCheckedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  useEffect(() => {
    onSelectionChange?.(checkedIds.size)
  }, [checkedIds, onSelectionChange])

  // Mutable ref so useImperativeHandle always calls the latest version
  const handleGenerateLeaseRef = useRef<() => void>(() => {})

  function handleGenerateLease() {
    const sel = filtered.filter((v) => checkedIds.has(v.id))
    setPendingVehicles(sel)
    setMasterLeaseModalOpen(true)
  }

  handleGenerateLeaseRef.current = handleGenerateLease

  useImperativeHandle(ref, () => ({
    createLease: () => handleGenerateLeaseRef.current(),
  }), [])

  function routeToSingleLease(vehicle: VehicleOnOrderRecord) {
    const params = new URLSearchParams()
    if (vehicle.vin)          params.set('vin',   vehicle.vin)
    if (vehicle.model_year)   params.set('year',  vehicle.model_year)
    if (vehicle.oem)          params.set('make',  vehicle.oem)
    if (vehicle.vehicle_line) params.set('model', vehicle.vehicle_line)
    router.push(`/new-lease?${params.toString()}`)
  }

  function confirmMasterLease() {
    setMasterLeaseModalOpen(false)
    router.push('/new-lease?masterLeaseAgreement=true')
  }

  function declineMasterLease() {
    const first = pendingVehicles[0]
    setMasterLeaseModalOpen(false)
    if (first) routeToSingleLease(first)
    else router.push('/new-lease?leaseType=standard')
  }

  function resize(key: ColKey, delta: number) {
    setColWidths((prev) => ({ ...prev, [key]: Math.max(60, (prev[key] ?? 120) + delta) }))
  }

  const visibleDefs = visibleCols
    .map((k) => COLUMNS.find((c) => c.key === k)!)
    .filter(Boolean)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Total Vehicles banner ── */}
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Total Vehicles On Order</p>
          <p className="text-2xl font-bold text-brand-700">{vehicles.length.toLocaleString()}</p>
        </div>
      </div>

      {/* ── KPI status cards ── */}
      <div>
        <VehiclesOnOrderKPIs
          vehicles={vehicles}
          onFilterByStatus={(statuses) => {
            setFilters((f) => ({ ...f, shaedStatus: statuses }))
            setPage(1)
          }}
        />
      </div>

      {/* ── Filter dropdowns ── */}
      <div className="flex flex-wrap items-center gap-[17px] mt-4">
        <MultiSelectFilter
          label="Inventory Type"
          selected={filters.inventoryType}
          onChange={(v) => { setFilters((f) => ({ ...f, inventoryType: v })); setPage(1) }}
          options={inventoryTypes}
        />
        <MultiSelectFilter
          label="Stage"
          selected={filters.stage}
          onChange={(v) => { setFilters((f) => ({ ...f, stage: v })); setPage(1) }}
          options={stages}
        />
        <MultiSelectFilter
          label="Year"
          selected={filters.year}
          onChange={(v) => { setFilters((f) => ({ ...f, year: v })); setPage(1) }}
          options={years}
        />
        <MultiSelectFilter
          label="Make"
          selected={filters.make}
          onChange={(v) => { setFilters((f) => ({ ...f, make: v })); setPage(1) }}
          options={makes}
        />
        <MultiSelectFilter
          label="Model"
          selected={filters.model}
          onChange={(v) => { setFilters((f) => ({ ...f, model: v })); setPage(1) }}
          options={models}
        />
        <MultiSelectFilter
          label="SHAED Status"
          selected={filters.shaedStatus}
          onChange={(v) => { setFilters((f) => ({ ...f, shaedStatus: v })); setPage(1) }}
          options={shaedStatuses}
        />
        {hasDropdownFilters && (
          <button
            onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-400 transition-colors"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        {/* Toolbar: count left · search + buttons right */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
          <p className="text-xs text-gray-500 shrink-0 mr-auto">
            {filtered.length.toLocaleString()} of {vehicles.length.toLocaleString()} vehicles
          </p>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Stock #, VIN, OEM…"
              value={filters.search}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1) }}
              className="input pl-7 py-1.5 text-sm w-80"
            />
            {filters.search && (
              <button
                onClick={() => { setFilters((f) => ({ ...f, search: '' })); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => setColumnsModalOpen(true)}
            className="btn-secondary py-1.5 text-xs flex items-center gap-1.5"
          >
            <Columns size={13} /> Columns
          </button>
          <button disabled className="inline-flex items-center gap-1.5 rounded-md border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm opacity-40 cursor-not-allowed">
            <PlusCircle size={13} /> Add Vehicle
          </button>
          <button onClick={() => exportToExcel(filtered)} className="btn-secondary py-1.5 text-xs flex items-center gap-1.5">
            <FilePlus size={13} /> Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 40, minWidth: 40 }} className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                </th>
                <th style={{ width: 70, minWidth: 70 }} className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-900">Details</th>
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
                  <td colSpan={visibleDefs.length + 2} className="px-6 py-12 text-center text-sm text-gray-400">
                    No vehicles match the current search.
                  </td>
                </tr>
              ) : (
                paginated.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className={clsx(
                      'border-t border-gray-100 hover:bg-gray-50 transition-colors',
                      checkedIds.has(vehicle.id) && 'bg-brand-50'
                    )}
                  >
                    <td className="border-r border-gray-100 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(vehicle.id)}
                        onChange={() => toggleId(vehicle.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => setSelected(vehicle)}
                        className="rounded p-1 text-teal-500 hover:bg-teal-50 transition-colors"
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
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={13} /> Prev
              </button>

              {pageNumbers.map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx(
                      'min-w-[28px] rounded px-2 py-1 text-xs font-medium',
                      currentPage === p
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={13} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Detail modal ── */}
      {selected && (
        <VehicleDetailModal vehicle={selected} onClose={() => setSelected(null)} />
      )}

      {/* ── Organize Columns modal ── */}
      {columnsModalOpen && (
        <OrganizeColumnsModal
          allColumns={COLUMNS}
          defaultCols={DEFAULT_COLS}
          visible={visibleCols}
          onApply={(cols) => setVisibleCols(cols as ColKey[])}
          onClose={() => setColumnsModalOpen(false)}
        />
      )}

      {/* ── Master Lease modal ── */}
      {masterLeaseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setMasterLeaseModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMasterLeaseModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Create New Lease
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              {pendingVehicles.length > 0
                ? <>{pendingVehicles.length === 1 ? <>You&apos;ve selected <strong>1 vehicle</strong>. </> : <>You&apos;ve selected <strong>{pendingVehicles.length} vehicles</strong>. </>}What type of lease would you like to create?</>
                : <>No vehicles selected. What type of lease would you like to create?</>
              }
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmMasterLease}
                className="btn-primary w-full justify-center"
              >
                New Master Lease Agreement
              </button>
              <button
                onClick={() => setMasterLeaseModalOpen(false)}
                className="btn-secondary w-full justify-center"
              >
                New Lease Schedule
              </button>
              <button
                onClick={declineMasterLease}
                className="btn-secondary w-full justify-center"
              >
                Individual Lease Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default VehiclesOnOrderTable
