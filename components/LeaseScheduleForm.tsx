'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ChevronLeft, ChevronRight, ClipboardList, Search, X } from 'lucide-react'
import StepIndicator from '@/components/StepIndicator'
import Step1Parties from './steps/Step1Parties'
import LeaseScheduleStep2Vehicles from './steps/LeaseScheduleStep2Vehicles'
import LeaseScheduleStep3Review from './steps/LeaseScheduleStep3Review'
import LeaseScheduleStep4Signatures from './steps/LeaseScheduleStep4Signatures'
import type { LeaseFormData } from '@/lib/types'
import type { MasterLeaseAgreement } from '@/lib/types'
import type { LeaseScheduleFormData, LeaseScheduleVehicleEntry } from '@/lib/lease-schedule-types'
import type { UseFormReturn } from 'react-hook-form'

const STEPS = [
  { id: 1, label: 'Parties' },
  { id: 2, label: 'Vehicles' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Signatures' },
]

const DEFAULT_VALUES: Partial<LeaseScheduleFormData> = {
  lessorName:    'All Four, LLC',
  lessorAddress: '1 TeamQuest Way',
  lessorPoBox:   'P.O. Box 147',
  lessorCity:    'Clear Lake',
  lessorState:   'IA',
  lessorZip:     '50428',

  leaseType:         'Core',
  contractStructure: 'Closed-End Lease',
  customerType:      'Business',
  vehicleUse:        'Standard Customer Use',

  lesseeType:      '',
  lesseeFirstName: '',
  lesseeLastName:  '',
  location:        '',

  vehicles: [],
  lesseeSignatories:     [{ firstName: '', lastName: '', email: '' }],
  lessorSignatoryName:   'Jim Liverseed',
  lessorSignatoryTitle:  'Lease Sales Consultant',
  lessorSignatoryEmail:  'hill.mugisha@pritchards.com',

  mla_id: null,
}

// ─── MLA Picker ────────────────────────────────────────────────────────────────

function MlaPicker({ onSelect }: { onSelect: (mla: MasterLeaseAgreement) => void }) {
  const [mlas, setMlas]       = useState<MasterLeaseAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/master-lease-agreements?status=executed')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMlas(data)
        else setError('Could not load Master Lease Agreements.')
      })
      .catch(() => setError('Network error loading MLAs.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = mlas.filter((m) => {
    const q = search.toLowerCase()
    return (
      m.mla_number.toLowerCase().includes(q) ||
      m.lessee_name.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col items-center py-10 max-w-2xl mx-auto">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 mb-4">
        <ClipboardList size={22} className="text-purple-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Select a Master Lease Agreement</h2>
      <p className="text-sm text-gray-500 mb-6 text-center">
        This Lease Schedule must be attached to an executed MLA.
        Choose the MLA below — the lessee information will be pre-filled from it.
      </p>

      {/* Search */}
      <div className="relative w-full mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by MLA number or lessee name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-8 py-2 text-sm w-full"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-gray-400 py-8">Loading executed MLAs…</p>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600 py-4">{error}</p>
      )}

      {!loading && !error && mlas.length === 0 && (
        <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-5 py-8 text-center">
          <p className="text-sm font-medium text-gray-700">No executed MLAs found</p>
          <p className="mt-1 text-xs text-gray-400">
            Create and execute a Master Lease Agreement first, then return here to attach a schedule to it.
          </p>
        </div>
      )}

      {!loading && !error && mlas.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-gray-400 py-4">No MLAs match your search.</p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="w-full space-y-2">
          {filtered.map((mla) => (
            <li key={mla.id}>
              <button
                type="button"
                onClick={() => onSelect(mla)}
                className="w-full text-left rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-purple-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{mla.mla_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{mla.lessee_name}</p>
                  </div>
                  {mla.executed_date && (
                    <span className="shrink-0 text-xs text-gray-400">
                      Executed {new Date(mla.executed_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function LeaseScheduleForm({
  initialVehicles = [],
}: {
  initialVehicles?: LeaseScheduleVehicleEntry[]
}) {
  const [selectedMla, setSelectedMla] = useState<MasterLeaseAgreement | null>(null)
  const [step, setStep] = useState(1)

  const scheduleDate = new Date().toISOString().slice(0, 10)

  const form = useForm<LeaseScheduleFormData>({
    defaultValues: {
      ...DEFAULT_VALUES,
      scheduleDate,
      vehicles: initialVehicles.map((v) => ({
        ...v,
        lease_start_date: scheduleDate,
        term: 24,
        net_cap_cost: 0,
        monthly_payment: 0,
        residual_value: 0,
      })),
    },
    mode: 'onTouched',
  })

  // When an MLA is selected, pre-fill the lessee fields from it and lock them
  function handleMlaSelect(mla: MasterLeaseAgreement) {
    setSelectedMla(mla)
    form.setValue('mla_id', mla.id)
    form.setValue('lesseeName',      mla.lessee_name)
    form.setValue('lesseeType',      (mla.lessee_type as 'business' | 'individual' | '') || 'business')
    form.setValue('lesseeFirstName', mla.lessee_first_name || '')
    form.setValue('lesseeLastName',  mla.lessee_last_name  || '')
    form.setValue('location',        mla.lessee_location   || '')
    form.setValue('address',         mla.lessee_address)
    form.setValue('city',            mla.lessee_city)
    form.setValue('state',           mla.lessee_state)
    form.setValue('zip',             mla.lessee_zip)
    form.setValue('phone',           mla.lessee_phone   || '')
    form.setValue('email',           mla.lessee_email)
  }

  function goToStep(target: number) {
    if (target >= 1 && target <= STEPS.length) setStep(target)
  }

  async function handleNext() {
    const ok = await form.trigger()
    if (!ok) return
    goToStep(step + 1)
  }

  function handleBack() {
    goToStep(step - 1)
  }

  // Show MLA picker until an MLA is chosen
  if (!selectedMla) {
    return <MlaPicker onSelect={handleMlaSelect} />
  }

  return (
    <div className="space-y-6">
      {/* Selected MLA banner */}
      <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <ClipboardList size={16} className="text-purple-600 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-purple-800">{selectedMla.mla_number}</span>
            <span className="mx-2 text-purple-300">·</span>
            <span className="text-xs text-purple-700">{selectedMla.lessee_name}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedMla(null)
            form.setValue('mla_id', null)
          }}
          className="text-xs text-purple-500 hover:text-purple-700 underline"
        >
          Change
        </button>
      </div>

      {/* ── Step indicator ── */}
      <StepIndicator
        steps={STEPS}
        currentStep={step}
        onStepClick={goToStep}
      />

      {/* ── Step content ── */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {step === 1 && (
          <Step1Parties
            form={form as unknown as UseFormReturn<LeaseFormData>}
            businessOnly
          />
        )}
        {step === 2 && (
          <LeaseScheduleStep2Vehicles form={form} />
        )}
        {step === 3 && (
          <LeaseScheduleStep3Review form={form} />
        )}
        {step === 4 && (
          <LeaseScheduleStep4Signatures form={form} />
        )}

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="btn-secondary flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} /> Back
          </button>

          {step < STEPS.length && (
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary flex items-center gap-1"
            >
              Next <ChevronRight size={15} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
