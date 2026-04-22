'use client'

import { useState, useEffect, useCallback } from 'react'
import ExpiredLeasesTable from '@/components/ExpiredLeasesTable'
import ExpiredLeasesKPIs from '@/components/ExpiredLeasesKPIs'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'
import { BarChart2, Table2, FilePlus } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'reporting' | 'details'

export default function ExpiredLeasesPage() {
  const [leases, setLeases]   = useState<LeasePortfolioRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('reporting')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/expired-leases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: LeasePortfolioRecord[] = await res.json()
      setLeases(data)
    } catch (err) {
      console.error('Failed to load expired leases:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'reporting', label: 'Reporting',    icon: BarChart2 },
    { id: 'details',  label: 'Lease Details', icon: Table2 },
  ]

  return (
    <div className="px-8 py-5 bg-white min-h-screen">
      {/* Page header */}
      <div className="pb-4 mb-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expired Leases</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Leases that have reached their end date and the vehicle has been returned.
          </p>
        </div>
        <button
          disabled
          className="btn-primary py-2 px-4 text-sm flex items-center gap-2 shrink-0 opacity-40 cursor-not-allowed"
        >
          <FilePlus size={15} /> Create New Lease
        </button>
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
        loading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <ExpiredLeasesKPIs leases={leases} />
        )
      )}

      {activeTab === 'details' && (
        <ExpiredLeasesTable
          leases={leases}
          loading={loading}
        />
      )}
    </div>
  )
}
