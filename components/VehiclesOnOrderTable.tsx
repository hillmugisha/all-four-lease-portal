'use client'

import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { usePersistedColumns } from '@/lib/usePersistedColumns'
import { useRouter } from 'next/navigation'
import { VehicleOnOrderRecord } from '@/lib/vehicles-on-order-types'
import { Columns, X, Search, ChevronLeft, ChevronRight, Eye, Download, Upload, PlusCircle, AlertTriangle, Loader2, Wrench, ShoppingCart } from 'lucide-react'
import { ActionsDropdown } from '@/components/ActionsDropdown'
import MultiSelectFilter from '@/components/MultiSelectFilter'
import OrganizeColumnsModal from '@/components/OrganizeColumnsModal'
import ExportVehiclesModal, { ColGroup } from '@/components/ExportVehiclesModal'
import ImportVehiclesModal from '@/components/ImportVehiclesModal'
import VehiclesOnOrderKPIs from '@/components/VehiclesOnOrderKPIs'
import clsx from 'clsx'
import { DR, MS } from '@/lib/table-utils'
import { VOO_APP_FIELDS } from '@/lib/voo-app-fields'

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

          <MS title="Lease Terms">
            {VOO_APP_FIELDS.map(f => {
              const raw = vehicle.app_data?.[f.key]
              const display = raw == null ? null
                : f.type === 'currency' ? Number(raw).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                : String(raw)
              return <DR key={f.key} label={f.label} value={display} />
            })}
          </MS>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
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
  | `app.${string}`

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

const DEFAULT_COLS: ColKey[] = COLUMNS.filter((c) => c.default).map((c) => c.key)

// App-owned columns — driven by the registry; hidden by default, toggleable via column widget
const APP_COLS: ColDef[] = VOO_APP_FIELDS.map(f => ({
  key:     `app.${f.key}` as ColKey,
  label:   f.label,
  default: false,
  width:   f.colWidth ?? 120,
}))

const ALL_COLUMNS     = [...COLUMNS, ...APP_COLS]
const ALL_DEFAULT_COLS = DEFAULT_COLS

// ─── Export / Import configuration ───────────────────────────────────────────

const VOO_EXPORT_GROUPS: ColGroup<VehicleOnOrderRecord>[] = [
  {
    name: 'Identifiers', required: true,
    cols: [
      { label: 'ID',           key: 'id'           },
      { label: 'Stock #',      key: 'stock_number'  },
      { label: 'VIN',          key: 'vin'           },
      { label: 'Model Year',   key: 'model_year'    },
      { label: 'OEM',          key: 'oem'           },
      { label: 'Vehicle Line', key: 'vehicle_line'  },
    ],
  },
  {
    name: 'SHAED Tracking Data', required: false,
    bucketHeader: 'SHAED Tracking Data',
    cols: [
      { label: 'OEM Order #',             key: 'oem_order_number'                 },
      { label: 'Order Date',              key: 'order_date'                       },
      { label: 'Tracking Type',           key: 'tracking_type'                    },
      { label: 'Body Code',               key: 'body_code'                        },
      { label: 'Color',                   key: 'color'                            },
      { label: 'Ship To',                 key: 'ship_to_location'                 },
      { label: 'Stage',                   key: 'stage'                            },
      { label: 'Inventory Type',          key: 'inventory_type'                   },
      { label: 'Target Production Wk',    key: 'target_production_week'           },
      { label: 'OEM Status',              key: 'oem_status'                       },
      { label: 'SHAED Status',            key: 'shaed_status'                     },
      { label: 'Chassis ETA',             key: 'chassis_eta'                      },
      { label: 'Expected Delivery',       key: 'expected_delivery_date'           },
      { label: 'Customer Name',           key: 'customer_name'                    },
      { label: 'Sales Person',            key: 'sales_person'                     },
      { label: 'Customer PO #',           key: 'customer_po_number'               },
      { label: 'Customer PO Date',        key: 'customer_po_date'                 },
      { label: 'Customer Invoice #',      key: 'customer_invoice_number'          },
      { label: 'Invoice Amount',          key: 'invoice_amount'                   },
      { label: 'Invoice Date',            key: 'invoice_date'                     },
      { label: 'Invoice Due Date',        key: 'invoice_due_date'                 },
      { label: 'Payment Date',            key: 'payment_date'                     },
      { label: 'Upfitter Name',           key: 'upfitter_name'                    },
      { label: 'Rcvd at Upfitter',        key: 'date_received_at_upfitter'        },
      { label: 'Upfit Status',            key: 'upfit_status'                     },
      { label: 'Est. Upfit Completion',   key: 'estimated_upfit_completion_date'  },
      { label: 'Actual Upfit Completion', key: 'actual_upfit_completion_date'     },
      { label: 'Logistics Status',        key: 'logistics_status'                 },
    ],
  },
  {
    // Lease Terms group — data-driven from the registry; new fields appear here automatically
    name: 'Lease Terms', required: false,
    bucketHeader: 'Internal Lease Data',
    cols: VOO_APP_FIELDS.map(f => ({
      label:    f.label,
      getValue: (v: VehicleOnOrderRecord) => v.app_data?.[f.key] ?? null,
    })),
  },
]

const VOO_IMPORT_GROUPS = [
  {
    name: 'Reference (do not edit)',
    cols: ['Stock #', 'VIN', 'Model Year', 'OEM', 'Vehicle Line'],
  },
  {
    // Editable fields — updates automatically when VOO_APP_FIELDS is extended
    name: 'Editable Fields',
    cols: VOO_APP_FIELDS.map(f => f.label),
  },
]

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

// ─── Cell renderer ────────────────────────────────────────────────────────────

function Cell({ col, vehicle }: { col: ColKey; vehicle: VehicleOnOrderRecord }) {
  if (col.startsWith('app.')) {
    const key      = col.slice(4)
    const fieldDef = VOO_APP_FIELDS.find(f => f.key === key)
    const raw      = vehicle.app_data?.[key]
    if (raw == null) return <span className="text-gray-300">—</span>
    if (fieldDef?.type === 'currency') {
      return <span>{Number(raw).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
    }
    return <span>{String(raw)}</span>
  }
  const v = vehicle[col as keyof VehicleOnOrderRecord] as string | null
  if (col === 'shaed_status') return <ShaedBadge status={v} />
  return <span className={clsx(col === 'vin' && 'font-mono text-xs')}>{v ?? '—'}</span>
}

// ─── Public handle type ───────────────────────────────────────────────────────

export interface VehiclesOnOrderTableHandle {
  createLease: () => void
}

// ─── Dispose confirmation modals ─────────────────────────────────────────────

function DisposeConfirmModal({
  title, bodyText, count, onConfirm, onCancel, confirming, error,
}: {
  title: string
  bodyText: string
  count: number
  onConfirm: () => void
  onCancel: () => void
  confirming: boolean
  error?: string | null
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-900">{title}</span>
          </div>
          <button onClick={onCancel} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            Are you sure you want to mark {count === 1 ? 'this vehicle' : `these ${count} vehicles`}?
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-0.5">
            <p className="text-xs font-semibold text-gray-700">
              {count === 1 ? '1 vehicle' : `${count} vehicles`}
            </p>
            <p className="text-xs text-gray-500">{bodyText}</p>
          </div>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onCancel} disabled={confirming} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {confirming ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
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
>(function VehiclesOnOrderTable({ vehicles, loading, onRefresh, onSelectionChange }, ref) {
  const router = useRouter()
  const [filters, setFilters]               = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage]                     = useState(1)
  const [selected, setSelected]             = useState<VehicleOnOrderRecord | null>(null)
  const [visibleCols, setVisibleCols]       = usePersistedColumns('cols:vehicles-on-order', DEFAULT_COLS)
  const [columnsModalOpen, setColumnsModalOpen] = useState(false)
  const [checkedIds, setCheckedIds]         = useState<Set<number>>(new Set())
  const [masterLeaseModalOpen, setMasterLeaseModalOpen] = useState(false)
  const [pendingVehicles, setPendingVehicles] = useState<VehicleOnOrderRecord[]>([])
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [soldConfirmOpen, setSoldConfirmOpen] = useState(false)
  const [oosConfirmOpen, setOosConfirmOpen]   = useState(false)
  const [disposeLoading, setDisposeLoading]   = useState(false)
  const [disposeError, setDisposeError]       = useState<string | null>(null)

  const filtered       = useMemo(() => applyFilters(vehicles, filters),                    [vehicles, filters])
  const inventoryTypes = useMemo(() => distinct(applyFilters(vehicles, filters, 'inventoryType'), (v) => v.inventory_type).sort(), [vehicles, filters])
  const stages         = useMemo(() => distinct(applyFilters(vehicles, filters, 'stage'),         (v) => v.stage).sort(),          [vehicles, filters])
  const years          = useMemo(() => distinct(applyFilters(vehicles, filters, 'year'),          (v) => v.model_year).sort((a, b) => b.localeCompare(a)), [vehicles, filters])
  const makes          = useMemo(() => distinct(applyFilters(vehicles, filters, 'make'),          (v) => v.oem).sort(),             [vehicles, filters])
  const models         = useMemo(() => distinct(applyFilters(vehicles, filters, 'model'),         (v) => v.vehicle_line).sort(),    [vehicles, filters])
  const shaedStatuses  = useMemo(() => distinct(applyFilters(vehicles, filters, 'shaedStatus'),   (v) => v.shaed_status).sort(),    [vehicles, filters])

  const hasDropdownFilters = !!filters.search || filters.inventoryType.length > 0 || filters.stage.length > 0 || filters.year.length > 0 || filters.make.length > 0 || filters.model.length > 0 || filters.shaedStatus.length > 0

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
    sessionStorage.setItem('vooPreload', JSON.stringify({
      stock_number: vehicle.stock_number,
      vin:          vehicle.vin,
      year:         vehicle.model_year,
      make:         vehicle.oem,
      model:        vehicle.vehicle_line,
      color:        vehicle.color,
      app_data:     vehicle.app_data ?? {},
    }))
    router.push('/new-lease')
  }

  function declineMasterLease() {
    const first = pendingVehicles[0]
    setMasterLeaseModalOpen(false)
    if (first) routeToSingleLease(first)
    else router.push('/new-lease?leaseType=standard')
  }

  function routeToLeaseSchedule() {
    if (pendingVehicles.length === 0) return
    // Include app_data and stock_number so LeaseScheduleForm can persist them to the leases table
    sessionStorage.setItem('leaseScheduleVehicles', JSON.stringify(pendingVehicles))
    setMasterLeaseModalOpen(false)
    router.push('/new-lease-schedule')
  }

  async function handleDispose(disposition: 'sold' | 'out_of_service') {
    const ids = Array.from(checkedIds)
    setDisposeLoading(true)
    setDisposeError(null)
    try {
      const res = await fetch('/api/vehicles-on-order/dispose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, disposition }),
      })
      const body = await res.json()
      if (!res.ok) {
        setDisposeError(body.error ?? `Server error (${res.status}) — please try again.`)
        return
      }
      setSoldConfirmOpen(false)
      setOosConfirmOpen(false)
      setCheckedIds(new Set())
      onRefresh()
    } catch {
      setDisposeError('Network error — please check your connection and try again.')
    } finally {
      setDisposeLoading(false)
    }
  }

  const visibleDefs = visibleCols
    .map((k) => ALL_COLUMNS.find((c) => c.key === k)!)
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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

        {/* Toolbar: count left · buttons right */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
          <p className="text-xs text-gray-500 shrink-0 mr-auto">
            {filtered.length.toLocaleString()} of {vehicles.length.toLocaleString()} vehicles
          </p>

          <button
            onClick={() => setColumnsModalOpen(true)}
            className="btn-secondary py-1.5 text-xs flex items-center gap-1.5"
          >
            <Columns size={13} /> Columns
          </button>
          <button disabled className="inline-flex items-center gap-1.5 rounded-md border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm opacity-40 cursor-not-allowed">
            <PlusCircle size={13} /> Add Vehicle
          </button>
          <button onClick={() => setImportModalOpen(true)} className="btn-secondary py-1.5 text-xs flex items-center gap-1.5">
            <Upload size={13} /> Import
          </button>
          <button onClick={() => setExportModalOpen(true)} className="btn-secondary py-1.5 text-xs flex items-center gap-1.5">
            <Download size={13} /> Export
          </button>
          <ActionsDropdown
            count={checkedIds.size}
            actions={[
              {
                label: someChecked ? `Mark Out of Service (${checkedIds.size})` : 'Mark Out of Service',
                icon: <Wrench size={13} />,
                onClick: () => { setDisposeError(null); setOosConfirmOpen(true) },
                disabled: !someChecked || disposeLoading,
                loading: disposeLoading,
                textClassName: 'text-red-600',
              },
              {
                label: someChecked ? `Mark as Sold (${checkedIds.size})` : 'Mark as Sold',
                icon: <ShoppingCart size={13} />,
                onClick: () => { setDisposeError(null); setSoldConfirmOpen(true) },
                disabled: !someChecked || disposeLoading,
                loading: disposeLoading,
                textClassName: 'text-emerald-600',
              },
            ]}
          />
        </div>

        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
          <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed', minWidth: 110 + visibleDefs.reduce((acc, col) => acc + col.width, 0) }}>
            <thead className="sticky top-0 z-10" style={{ boxShadow: '0 1px 0 #e5e7eb' }}>
              <tr>
                <th style={{ width: 40 }} className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                </th>
                <th style={{ width: 70 }} className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-900">Details</th>
                {visibleDefs.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className="border-r border-[#D6E4FF] bg-[#F5F9FF] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900"
                  >
                    {col.label}
                  </th>
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
                        title={col.key.startsWith('app.') ? undefined : (vehicle[col.key as keyof VehicleOnOrderRecord] as string | null) ?? undefined}
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
          allColumns={ALL_COLUMNS}
          defaultCols={ALL_DEFAULT_COLS}
          visible={visibleCols}
          onApply={(cols) => setVisibleCols(cols as ColKey[])}
          onClose={() => setColumnsModalOpen(false)}
        />
      )}

      <ExportVehiclesModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        records={filtered}
        groups={VOO_EXPORT_GROUPS}
        filename="vehicles-on-order"
        sheetName="Vehicles on Order"
      />
      <ImportVehiclesModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => { setImportModalOpen(false); onRefresh() }}
        apiEndpoint="/api/vehicles-on-order/import"
        matchKey="Stock #"
        columnGroups={VOO_IMPORT_GROUPS}
        tips={[
          'Export vehicles first to get the correct template with Stock # and column headers',
          'Fill in the Editable Fields columns — do not edit Stock #, VIN, or other reference columns',
          'Column names must match the template exactly',
        ]}
      />

      {/* ── Master Lease modal ── */}
      {masterLeaseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setMasterLeaseModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMasterLeaseModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Create New Agreement
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              {pendingVehicles.length > 0
                ? <>{pendingVehicles.length === 1 ? <>You&apos;ve selected <strong>1 vehicle</strong>. </> : <>You&apos;ve selected <strong>{pendingVehicles.length} vehicles</strong>. </>}What type of lease would you like to create?</>
                : <>No vehicles selected. What type of lease would you like to create?</>
              }
            </p>
            <div className="flex flex-col gap-3">
              <div
                title={pendingVehicles.length === 0 ? "Select vehicles to begin creating a new lease schedule" : undefined}
                className="w-full"
              >
                <button
                  onClick={routeToLeaseSchedule}
                  disabled={pendingVehicles.length === 0}
                  className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  New Lease Schedule
                </button>
              </div>
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

      {oosConfirmOpen && (
        <DisposeConfirmModal
          title="Mark Out of Service"
          bodyText="Will be removed from Vehicles on Order."
          count={checkedIds.size}
          onConfirm={() => handleDispose('out_of_service')}
          onCancel={() => setOosConfirmOpen(false)}
          confirming={disposeLoading}
          error={disposeError}
        />
      )}

      {soldConfirmOpen && (
        <DisposeConfirmModal
          title="Mark as Sold"
          bodyText="Will be removed from Vehicles on Order."
          count={checkedIds.size}
          onConfirm={() => handleDispose('sold')}
          onCancel={() => setSoldConfirmOpen(false)}
          confirming={disposeLoading}
          error={disposeError}
        />
      )}
    </div>
  )
})

export default VehiclesOnOrderTable
