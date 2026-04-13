'use client'

import { useState } from 'react'
import LeaseForm from '@/components/LeaseForm'
import LeaseTable from '@/components/LeaseTable'
import { LayoutDashboard, FilePlus } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'dashboard' | 'create'

export default function NewLeasePage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Pipeline',         icon: LayoutDashboard },
    { id: 'create',    label: 'Create New Lease', icon: FilePlus },
  ]

  return (
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Lease Agreement</h1>
        <p className="mt-1 text-sm text-gray-500">
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
        <LeaseTable />
      )}

      {activeTab === 'create' && (
        <LeaseForm />
      )}
    </div>
  )
}
