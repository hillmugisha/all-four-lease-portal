'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { LeaseFormData, LeaseRecord } from '@/lib/types'
import { calculateLease } from '@/lib/calculations'
import Step1Parties    from './steps/Step1Parties'
import Step3Vehicle    from './steps/Step3Vehicle'
import Step4Financials from './steps/Step4Financials'
import Step5Review     from './steps/Step5Review'
import Step5Signatures from './steps/Step5Signatures'
import { ChevronLeft, ChevronRight, FileDown, Loader2, Check, Save } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { id: 1, label: 'Parties' },
  { id: 2, label: 'Vehicle' },
  { id: 3, label: 'Financials' },
  { id: 4, label: 'Review' },
  { id: 5, label: 'Signatures' },
]

const DEFAULT_VALUES: Partial<LeaseFormData> = {
  // Lessor — pre-filled with All Four defaults
  lessorName:    'All Four, LLC',
  lessorAddress: '1 TeamQuest Way',
  lessorPoBox:   'P.O. Box 147',
  lessorCity:    'Clear Lake',
  lessorState:   'IA',
  lessorZip:     '50428',

  // Lease classification
  leaseType:    'Closed-End Lease',
  customerType: 'Business',
  vehicleUse:   'Standard Customer Use',

  // Vehicle
  condition: 'NEW',

  // Lease terms
  leaseDate:          new Date().toISOString().slice(0, 10),
  numPayments:        24,
  paymentDay:         21,
  milesPerYear:       15000,
  excessMileageRate:  0.25,
  dispositionFee:     195,
  earlyTerminationFee: 0,
  purchaseOptionFee:  0,

  // Financials — zero defaults
  taxes:              0,
  titleRegFees:       0,
  acquisitionFee:     0,
  docFee:             0,
  priorLeaseBalance:  0,
  optionalProducts:   0,
  capCostReduction:   0,
  monthlySalesTax:    0,
  tradeinGrossAllowance: 0,
  tradeinPriorBalance:   0,

  // Signatures
  lesseeSignatories:     [{ firstName: '', lastName: '', email: '' }],
  lessorSignatoryName:   'Jim Liverseed',
  lessorSignatoryTitle:  'Lease Sales Consultant',
  lessorSignatoryEmail:  'hill.mugisha@pritchards.com',
}

export default function LeaseForm() {
  const router = useRouter()
  const [step, setStep]       = useState(1)
  const [saving, setSaving]         = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved]   = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [done, setDone]             = useState(false)

  const form = useForm<LeaseFormData>({ defaultValues: DEFAULT_VALUES, mode: 'onTouched' })

  // ── Free navigation: click any step to jump ──────────────────────────────
  function goToStep(target: number) {
    setStep(target)
  }

  async function handleNext() {
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1))
  }

  // ── Build API payload from form values ───────────────────────────────────
  function buildPayload(raw: LeaseFormData) {
    return {
      lessor_name:    raw.lessorName,
      lessor_address: raw.lessorAddress,
      lessor_po_box:  raw.lessorPoBox || null,
      lessor_city:    raw.lessorCity,
      lessor_state:   (raw.lessorState ?? '').toUpperCase(),
      lessor_zip:     raw.lessorZip,

      lessee_name:           raw.lesseeName,
      lessee_address:        raw.address,
      lessee_city:           raw.city,
      lessee_state:          (raw.state ?? '').toUpperCase(),
      lessee_zip:            raw.zip,
      lessee_phone:          raw.phone || null,
      lessee_email:          raw.email,

      lease_date:            raw.leaseDate,

      vehicle_condition:     raw.condition,
      vehicle_year:          raw.year,
      vehicle_make:          raw.make,
      vehicle_model:         raw.model,
      vehicle_body_style:    raw.bodyStyle,
      vehicle_vin:           raw.vin ? raw.vin.toUpperCase() : '',
      vehicle_odometer:      raw.odometer || null,

      vehicle_agreed_value:  Number(raw.vehicleAgreedValue),
      taxes:                 Number(raw.taxes),
      title_reg_fees:        Number(raw.titleRegFees),
      acquisition_fee:       Number(raw.acquisitionFee),
      doc_fee:               Number(raw.docFee),
      prior_lease_balance:   Number(raw.priorLeaseBalance ?? 0),
      optional_products:     Number(raw.optionalProducts ?? 0),
      cap_cost_reduction:    Number(raw.capCostReduction ?? 0),
      residual_value:        Number(raw.residualValue),
      rent_charge:           Number(raw.rentCharge),
      num_payments:          Number(raw.numPayments),
      monthly_sales_tax:     Number(raw.monthlySalesTax ?? 0),
      first_payment_date:    raw.firstPaymentDate,
      payment_day:           Number(raw.paymentDay),
      miles_per_year:        Number(raw.milesPerYear),
      excess_mileage_rate:   Number(raw.excessMileageRate),
      disposition_fee:       Number(raw.dispositionFee ?? 195),
      early_termination_fee: Number(raw.earlyTerminationFee ?? 0),
      purchase_option_fee:   Number(raw.purchaseOptionFee ?? 0),

      tradein_year:          raw.tradeinYear || null,
      tradein_make:          raw.tradeinMake || null,
      tradein_model:         raw.tradeinModel || null,
      tradein_gross_allowance: Number(raw.tradeinGrossAllowance ?? 0),
      tradein_prior_balance:   Number(raw.tradeinPriorBalance ?? 0),

      lessor_signer_title: raw.lessorSignatoryTitle || null,
      lessor_signer_name:  raw.lessorSignatoryName  || null,
    }
  }

  // ── Save Draft ────────────────────────────────────────────────────────────
  async function handleSaveDraft() {
    setSavingDraft(true)
    setSaveError(null)
    setDraftSaved(false)
    try {
      const raw = form.getValues()
      const payload = { ...buildPayload(raw), status: 'draft' }
      const res = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const saved = await res.json()
      if (!res.ok) throw new Error(saved.error ?? 'Save failed')
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 4000)
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSavingDraft(false)
    }
  }

  // ── Submit: save to Supabase + generate PDF ──────────────────────────────
  async function handleSubmit() {
    setSaving(true)
    setSaveError(null)

    try {
      const raw = form.getValues()
      const payload = buildPayload(raw)

      const saveRes = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const saved = await saveRes.json() as LeaseRecord & { error?: string }
      if (!saveRes.ok) throw new Error(saved.error ?? 'Save failed')

      const pdfRes = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: saved }),
      })
      if (!pdfRes.ok) throw new Error('PDF generation failed')

      const blob = await pdfRes.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `lease-${saved.lessee_name.replace(/\s+/g, '-')}-${saved.vehicle_vin}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Lease Created!</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          The PDF has been downloaded and the record has been saved to the dashboard.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => router.push('/new-lease')} className="btn-primary">
            View Dashboard
          </button>
          <button
            onClick={() => { setDone(false); setStep(1); form.reset(DEFAULT_VALUES) }}
            className="btn-secondary"
          >
            New Lease
          </button>
        </div>
      </div>
    )
  }

  const data = form.watch()

  return (
    <div className="space-y-6">

      {/* ── Step indicator ────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-2">
        {STEPS.map((s, i) => {
          const isActive    = step === s.id
          const isCompleted = step > s.id

          return (
            <div key={s.id} className="flex flex-1 items-center">
              {/* Step button */}
              <button
                type="button"
                onClick={() => goToStep(s.id)}
                className="flex flex-col items-center gap-1.5 focus:outline-none group"
              >
                {/* Circle */}
                <div className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                  isActive
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : isCompleted
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400 group-hover:border-gray-400'
                )}>
                  {isCompleted ? <Check size={13} strokeWidth={2.5} /> : s.id}
                </div>
                {/* Label */}
                <span className={clsx(
                  'text-xs font-medium whitespace-nowrap transition-colors',
                  isActive    ? 'text-brand-600' :
                  isCompleted ? 'text-brand-600' :
                                'text-gray-400 group-hover:text-gray-500'
                )}>
                  {s.label}
                </span>
              </button>

              {/* Connector line — between steps */}
              {i < STEPS.length - 1 && (
                <div className={clsx(
                  'mx-2 mb-5 h-px flex-1 transition-colors',
                  step > s.id ? 'bg-brand-600' : 'bg-gray-200'
                )} />
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Step content ─────────────────────────────────────────────────── */}
      <div className="card p-6 sm:p-8">
        {step === 1 && <Step1Parties    form={form} />}
        {step === 2 && <Step3Vehicle    form={form} />}
        {step === 3 && <Step4Financials form={form} />}
        {step === 4 && <Step5Review     form={form} />}
        {step === 5 && <Step5Signatures form={form} />}
      </div>

      {/* ── Draft saved banner ───────────────────────────────────────────── */}
      {draftSaved && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <Check size={15} className="shrink-0" />
          Draft saved — you can find it in the dashboard with status <strong>Draft</strong>.
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {saveError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* ── Navigation buttons ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="btn-secondary"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-3">
          {/* Save Draft — available on any step */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="btn-secondary"
          >
            {savingDraft ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={15} />
                Save Draft
              </>
            )}
          </button>

          {step < STEPS.length && (
            <button type="button" onClick={handleNext} className="btn-primary">
              Next
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
