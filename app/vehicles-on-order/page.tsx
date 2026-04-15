'use client'

import { useState, useEffect, useCallback } from 'react'
import VehiclesOnOrderTable from '@/components/VehiclesOnOrderTable'
import { VehicleOnOrderRecord } from '@/lib/vehicles-on-order-types'

export default function VehiclesOnOrderPage() {
  const [vehicles, setVehicles] = useState<VehicleOnOrderRecord[]>([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/vehicles-on-order')
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
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles on Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reserved and in-transit vehicles — stock and sold orders.
        </p>
      </div>

      <VehiclesOnOrderTable
        vehicles={vehicles}
        loading={loading}
        onRefresh={load}
      />
    </div>
  )
}
