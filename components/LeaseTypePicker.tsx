'use client'

import { FileText, ClipboardList } from 'lucide-react'

type LeaseMode = 'standard' | 'master_agreement'

export default function LeaseTypePicker({ onSelect }: { onSelect: (type: LeaseMode) => void }) {
  return (
    <div className="flex flex-col items-center py-10">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">What would you like to create?</h2>
      <p className="text-sm text-gray-500 mb-8">Select the type of lease agreement you need.</p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 w-full max-w-2xl">

        <button
          type="button"
          onClick={() => onSelect('standard')}
          className="card p-6 text-left hover:border-brand-300 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 mb-4 group-hover:bg-brand-100 transition-colors">
            <FileText size={20} className="text-brand-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Standard Lease Agreement</h3>
          <p className="text-xs text-gray-500">
            5 steps — Parties, Vehicle, Financials, Review, Signatures. Full lease agreement with vehicle and financial details.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect('master_agreement')}
          className="card p-6 text-left hover:border-brand-300 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 mb-4 group-hover:bg-purple-100 transition-colors">
            <ClipboardList size={20} className="text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Master Lease Agreement</h3>
          <p className="text-xs text-gray-500">
            3 steps — Parties, Review, Signatures. Framework agreement between lessor and lessee. No vehicle or financial details.
          </p>
        </button>

      </div>
    </div>
  )
}
