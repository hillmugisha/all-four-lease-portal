'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import LeaseForm from '@/components/LeaseForm'
import LeaseTable from '@/components/LeaseTable'
import { LayoutDashboard, FilePlus } from 'lucide-react'
import clsx from 'clsx'
import type { VehicleOnOrderSummary } from '@/lib/types'

type Tab = 'dashboard' | 'create'

function NewLeaseContent() {
  const searchParams = useSearchParams()
  const vin   = searchParams.get('vin')   ?? ''
  const year  = searchParams.get('year')  ?? ''
  const make  = searchParams.get('make')  ?? ''
  const model = searchParams.get('model') ?? ''
  const isMasterLease = searchParams.get('masterLease') === 'true'

  const prefill = vin ? { vin, year, make, model } : null

  const [masterLeaseVehicles, setMasterLeaseVehicles] = useState<VehicleOnOrderSummary[]>([])
  const [masterLeaseReady, setMasterLeaseReady] = useState(!isMasterLease)

  useEffect(() => {
    if (isMasterLease) {
      try {
        const stored = sessionStorage.getItem('masterLeaseVehicles')
        if (stored) {
          setMasterLeaseVehicles(JSON.parse(stored))
          sessionStorage.removeItem('masterLeaseVehicles')
        }
      } catch {
        // ignore parse errors
      }
      setMasterLeaseReady(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [activeTab, setActiveTab] = useState<Tab>(prefill || isMasterLease ? 'create' : 'dashboard')

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Pipeline',         icon: LayoutDashboard },
    { id: 'create',    label: 'Create New Lease', icon: FilePlus },
  ]

  return (
    <div className="px-8 py-5 bg-white min-h-screen">
      {/* Page header */}
      <div className="pb-4 mb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Create Lease Agreement</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Build and send lease agreements to customers for signature.
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
      {activeTab === 'dashboard' && (
        <LeaseTable onCreateNew={() => setActiveTab('create')} />
      )}

      {activeTab === 'create' && masterLeaseReady && (
        <LeaseForm
          vehiclePrefill={prefill}
          isMasterLease={isMasterLease}
          masterLeaseVehicles={masterLeaseVehicles}
        />
      )}
    </div>
  )
}

export default function NewLeasePage() {
  return (
    <Suspense>
      <NewLeaseContent />
    </Suspense>
  )
}
