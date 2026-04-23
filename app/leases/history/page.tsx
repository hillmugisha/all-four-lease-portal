'use client'

import { useState, useEffect, useCallback } from 'react'
import LeaseHistoryTable from '@/components/LeaseHistoryTable'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'

export default function LeaseHistoryPage() {
  const [leases, setLeases]   = useState<LeasePortfolioRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lease-history')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setLeases(await res.json())
    } catch (err) {
      console.error('Failed to load lease history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="px-8 py-5 bg-white min-h-screen">
      <div className="pb-4 mb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Lease History</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Archived expired lease records — not included in reporting or dashboards.
        </p>
      </div>
      <LeaseHistoryTable leases={leases} loading={loading} />
    </div>
  )
}
