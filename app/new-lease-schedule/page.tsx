'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import LeaseScheduleForm from '@/components/LeaseScheduleForm'
import type { LeaseScheduleVehicleEntry } from '@/lib/lease-schedule-types'

export default function NewLeaseSchedulePage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<LeaseScheduleVehicleEntry[] | null>(null)
  // Guard against React StrictMode double-invoking the effect in development.
  // The ref persists across the simulated unmount/remount, so the second call
  // sees initialized=true and bails out before the (now-deleted) key is missing.
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    try {
      const stored = sessionStorage.getItem('leaseScheduleVehicles')
      if (stored) {
        const parsed = JSON.parse(stored) as LeaseScheduleVehicleEntry[]
        sessionStorage.removeItem('leaseScheduleVehicles')
        setVehicles(parsed)
      } else {
        // No vehicles in storage — redirect back
        router.replace('/vehicles-on-order')
      }
    } catch {
      router.replace('/vehicles-on-order')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!vehicles) {
    return (
      <div className="px-8 py-10 text-sm text-gray-500">Loading…</div>
    )
  }

  return (
    <div className="px-8 py-5 bg-white min-h-screen">
      <div className="pb-4 mb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">New Lease Schedule</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Create a Lease Schedule for {vehicles.length} selected vehicle{vehicles.length !== 1 ? 's' : ''}.
          This schedule is an addendum to a Master Lease Agreement.
        </p>
      </div>
      <LeaseScheduleForm initialVehicles={vehicles} />
    </div>
  )
}
