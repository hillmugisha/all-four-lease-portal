'use client'

import { useState, useEffect, useCallback } from 'react'
import SoldLeasesTable from '@/components/SoldLeasesTable'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'

export default function PurchasedLeasesPage() {
  const [leases, setLeases]   = useState<LeasePortfolioRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sold-leases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: LeasePortfolioRecord[] = await res.json()
      setLeases(data)
    } catch (err) {
      console.error('Failed to load sold leases:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="px-8 py-5 bg-white min-h-screen">
      <div className="pb-4 mb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Sold Leases</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Vehicles that were marked as sold from the Active or Out of Service tab.
        </p>
      </div>

      <SoldLeasesTable leases={leases} loading={loading} />
    </div>
  )
}
