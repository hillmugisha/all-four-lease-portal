'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import LeaseForm from '@/components/LeaseForm'
import LeaseTable from '@/components/LeaseTable'
import LeaseTypePicker, { type LeaseMode } from '@/components/LeaseTypePicker'
import UploadExecutedMlaForm from '@/components/UploadExecutedMlaForm'
import UploadMlaForSigningForm from '@/components/UploadMlaForSigningForm'
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
  const isMasterLease          = searchParams.get('masterLease') === 'true'
  const isMasterLeaseAgreement = searchParams.get('masterLeaseAgreement') === 'true'
  const isStandardFromUrl      = searchParams.get('leaseType') === 'standard'

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

  function initialLeaseMode(): LeaseMode | null {
    if (isMasterLeaseAgreement) return 'master_agreement'
    if (prefill || isMasterLease || isStandardFromUrl) return 'standard'
    return null
  }

  const [activeTab, setActiveTab] = useState<Tab>('create')
  const [leaseMode, setLeaseMode] = useState<LeaseMode | null>(initialLeaseMode)

  function handleTabClick(id: Tab) {
    if (id === 'create' && activeTab !== 'create') setLeaseMode(null)
    setActiveTab(id)
  }

  function handleCreateNew() {
    setLeaseMode(null)
    setActiveTab('create')
  }

  function handleUploadSuccess() {
    setLeaseMode(null)
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'create',    label: 'New Agreement',   icon: FilePlus },
    { id: 'dashboard', label: 'Pipeline',        icon: LayoutDashboard },
  ]

  const isUploadMode = leaseMode === 'upload_executed_mla' || leaseMode === 'upload_mla_for_signing'

  return (
    <div className="px-8 py-5 bg-white min-h-screen">
      {/* Page header */}
      <div className="pb-4 mb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">New Agreement</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Build and send lease agreements to customers for signature.
        </p>
      </div>

      {/* Sub-tabs — hidden when in upload mode to give the form full focus */}
      {!isUploadMode && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
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
      )}

      {/* Tab content */}
      {activeTab === 'dashboard' && !isUploadMode && (
        <LeaseTable onCreateNew={handleCreateNew} />
      )}

      {activeTab === 'create' && !isMasterLease && leaseMode === null && (
        <LeaseTypePicker onSelect={setLeaseMode} />
      )}

      {activeTab === 'create' && (isMasterLease || (leaseMode !== null && !isUploadMode)) && masterLeaseReady && (
        <LeaseForm
          vehiclePrefill={prefill}
          isMasterLease={isMasterLease}
          masterLeaseVehicles={masterLeaseVehicles}
          isMasterLeaseAgreement={leaseMode === 'master_agreement'}
          onBack={!isMasterLease ? () => setLeaseMode(null) : undefined}
        />
      )}

      {leaseMode === 'upload_executed_mla' && (
        <UploadExecutedMlaForm
          onBack={() => setLeaseMode(null)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {leaseMode === 'upload_mla_for_signing' && (
        <UploadMlaForSigningForm
          onBack={() => setLeaseMode(null)}
          onSuccess={handleUploadSuccess}
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
