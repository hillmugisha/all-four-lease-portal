'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import VehiclesOnOrderTable, { VehiclesOnOrderTableHandle } from '@/components/VehiclesOnOrderTable'
import { VehicleOnOrderRecord } from '@/lib/vehicles-on-order-types'
import { FilePlus } from 'lucide-react'

export default function VehiclesOnOrderPage() {
  const [vehicles, setVehicles]       = useState<VehicleOnOrderRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const tableRef                      = useRef<VehiclesOnOrderTableHandle>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/vehicles-on-order', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: VehicleOnOrderRecord[] = await res.json()
      setVehicles(data)
    } catch (err) {
      console.error('Failed to load vehicles on order:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="px-8 py-5 bg-white min-h-screen">
      <div className="pb-4 mb-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vehicles On Order</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            All Four &amp; NIE Stock and Sold orders pulling directly from the SHAED Pritchard Portal
          </p>
        </div>
        <button
          onClick={() => tableRef.current?.createLease()}
          className="btn-primary py-2 px-4 text-sm flex items-center gap-2 shrink-0"
        >
          <FilePlus size={15} /> Create New Agreement
        </button>
      </div>

      <VehiclesOnOrderTable
        ref={tableRef}
        vehicles={vehicles}
        loading={loading}
        onRefresh={load}
      />
    </div>
  )
}
