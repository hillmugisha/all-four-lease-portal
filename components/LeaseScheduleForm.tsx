'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import StepIndicator from '@/components/StepIndicator'
import Step1Parties from './steps/Step1Parties'
import LeaseScheduleStep2Vehicles from './steps/LeaseScheduleStep2Vehicles'
import LeaseScheduleStep3Review from './steps/LeaseScheduleStep3Review'
import LeaseScheduleStep4Signatures from './steps/LeaseScheduleStep4Signatures'
import type { LeaseFormData } from '@/lib/types'
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
}

export default function LeaseScheduleForm({
  initialVehicles = [],
}: {
  initialVehicles?: LeaseScheduleVehicleEntry[]
}) {
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

  return (
    <div className="space-y-6">
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
