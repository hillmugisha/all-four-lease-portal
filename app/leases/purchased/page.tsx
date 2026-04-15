'use client'

import { useState, useEffect, useCallback } from 'react'
import SoldLeasesTable from '@/components/SoldLeasesTable'
import SoldLeasesKPIs from '@/components/SoldLeasesKPIs'
import { SoldLeaseRecord } from '@/lib/sold-lease-types'
import { BarChart2, Table2 } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'reporting' | 'details'

export default function PurchasedLeasesPage() {
  const [leases, setLeases]   = useState<SoldLeaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('reporting')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sold-leases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: SoldLeaseRecord[] = await res.json()
      setLeases(data)
    } catch (err) {
      console.error('Failed to load sold leases:', err)
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
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchased Leases</h1>
        <p className="mt-1 text-sm text-gray-500">
          Leases where the vehicle was sold or purchased at lease end.
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
        loading ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 h-24 animate-pulse" />
              ))}
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <SoldLeasesKPIs leases={leases} />
        )
      )}

      {activeTab === 'details' && (
        <SoldLeasesTable
          leases={leases}
          loading={loading}
          onRefresh={load}
        />
      )}
    </div>
  )
}
