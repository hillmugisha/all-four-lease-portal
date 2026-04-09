'use client'

import { useState, useEffect, useCallback } from 'react'
import CurrentLeasesTable from '@/components/CurrentLeasesTable'
import CurrentLeasesKPIs from '@/components/CurrentLeasesKPIs'
import { CurrentLeaseRecord } from '@/lib/current-lease-types'
import clsx from 'clsx'
import { BarChart2, Table2 } from 'lucide-react'

type Tab = 'reporting' | 'details'

export default function CurrentLeasesPage() {
  const [leases, setLeases] = useState<CurrentLeaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('reporting')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/current-leases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CurrentLeaseRecord[] = await res.json()
      setLeases(data)
    } catch (err) {
      console.error('Failed to load current leases:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'reporting',  label: 'Reporting',     icon: BarChart2 },
    { id: 'details',   label: 'Lease Details',  icon: Table2 },
  ]

  return (
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lease Pipeline &amp; Renewals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track expirations, identify renewal opportunities, and manage your active portfolio.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'reporting' && (
        <CurrentLeasesKPIs leases={leases} onViewAll={() => setActiveTab('details')} />
      )}

      {activeTab === 'details' && (
        <CurrentLeasesTable leases={leases} loading={loading} onRefresh={load} />
      )}
    </div>
  )
}
