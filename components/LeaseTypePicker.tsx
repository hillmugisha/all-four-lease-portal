'use client'

import { FileText, ClipboardList, FolderUp, Send } from 'lucide-react'

export type LeaseMode = 'standard' | 'master_agreement' | 'upload_executed_mla' | 'upload_mla_for_signing'

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
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Individual Lease Agreement</h3>
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
          <h3 className="text-sm font-semibold text-gray-900 mb-1">New Master Lease Agreement</h3>
          <p className="text-xs text-gray-500">
            3 steps — Parties, Review, Signatures. Framework agreement between lessor and lessee. No vehicle or financial details.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect('upload_executed_mla')}
          className="card p-6 text-left hover:border-brand-300 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 mb-4 group-hover:bg-green-100 transition-colors">
            <FolderUp size={20} className="text-green-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Upload Executed MLA</h3>
          <p className="text-xs text-gray-500">
            Record a Master Lease Agreement that was already signed offline. Upload the signed PDF for your records.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect('upload_mla_for_signing')}
          className="card p-6 text-left hover:border-brand-300 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 mb-4 group-hover:bg-amber-100 transition-colors">
            <Send size={20} className="text-amber-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Upload MLA for Signing</h3>
          <p className="text-xs text-gray-500">
            Upload a prepared MLA and send it to the customer via DocuSign for electronic signature.
          </p>
        </button>

      </div>
    </div>
  )
}
