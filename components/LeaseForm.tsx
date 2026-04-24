'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { LeaseFormData, LeaseRecord } from '@/lib/types'

// ─── Map a saved LeaseRecord back to form fields for editing ─────────────────
function recordToFormData(record: LeaseRecord): Partial<LeaseFormData> {
  // Prefer the stored signer name; fall back to the lessee name so first/last are never blank
  const rawSignerName = (record.customer_signer_name ?? record.lessee_name ?? '').trim()
  const lastSpace     = rawSignerName.lastIndexOf(' ')
  const signerFirst   = lastSpace > 0 ? rawSignerName.slice(0, lastSpace) : rawSignerName
  const signerLast    = lastSpace > 0 ? rawSignerName.slice(lastSpace + 1) : ''

  return {
    // Lessor
    lessorName:    record.lessor_name,
    lessorAddress: record.lessor_address,
    lessorPoBox:   record.lessor_po_box   ?? '',
    lessorCity:    record.lessor_city,
    lessorState:   record.lessor_state,
    lessorZip:     record.lessor_zip,

    // Lease classification
    leaseType:         record.lease_type          ?? 'Core',
    contractStructure: record.contract_structure  ?? 'Closed-End Lease',
    customerType:      record.customer_type       ?? 'Business',
    vehicleUse:        record.vehicle_use         ?? 'Standard Customer Use',
    department:        record.department          ?? '',
    departmentOther:   record.department_other    ?? '',

    // Lessee
    lesseeType:      record.lessee_type       ?? 'business',
    lesseeName:      record.lessee_name,
    lesseeFirstName: record.lessee_first_name ?? '',
    lesseeLastName:  record.lessee_last_name  ?? '',
    location:        record.lessee_location   ?? '',
    address:         record.lessee_address,
    city:            record.lessee_city,
    state:           record.lessee_state,
    zip:             record.lessee_zip,
    phone:           record.lessee_phone  ?? '',
    email:           record.lessee_email,

    // Vehicle
    condition: record.vehicle_condition,
    year:      record.vehicle_year,
    make:      record.vehicle_make,
    model:     record.vehicle_model,
    bodyStyle: record.vehicle_body_style,
    vin:       record.vehicle_vin,
    odometer:  record.vehicle_odometer ?? '',

    // Lease terms
    leaseDate:        record.lease_date,
    numPayments:      record.num_payments,
    firstPaymentDate: record.first_payment_date,
    paymentDay:       record.payment_day,

    // Financials
    vehicleAgreedValue:  record.vehicle_agreed_value,
    taxes:               record.taxes,
    titleRegFees:        record.title_reg_fees,
    acquisitionFee:      record.acquisition_fee,
    docFee:              record.doc_fee,
    priorLeaseBalance:   record.prior_lease_balance,
    optionalProducts:    record.optional_products,
    capCostReduction:    record.cap_cost_reduction,
    residualValue:       record.residual_value,
    rentCharge:          record.rent_charge,
    monthlySalesTax:     record.monthly_sales_tax,
    milesPerYear:        record.miles_per_year,
    excessMileageRate:   record.excess_mileage_rate,
    dispositionFee:      record.disposition_fee,
    earlyTerminationFee: record.early_termination_fee,
    purchaseOptionFee:   record.purchase_option_fee,

    // Trade-in
    tradeinYear:           record.tradein_year          ?? '',
    tradeinMake:           record.tradein_make          ?? '',
    tradeinModel:          record.tradein_model         ?? '',
    tradeinGrossAllowance: record.tradein_gross_allowance,
    tradeinPriorBalance:   record.tradein_prior_balance,

    // Signatories
    lessorSignatoryName:  record.lessor_signer_name  ?? 'Jim Liverseed',
    lessorSignatoryTitle: record.lessor_signer_title ?? 'Lease Sales Consultant',
    lessorSignatoryEmail: 'hill.mugisha@pritchards.com',
    lesseeSignatories: [{
      firstName: signerFirst,
      lastName:  signerLast,
      email:     record.customer_signer_email ?? record.lessee_email,
    }],

  }
}
import { calculateLease } from '@/lib/calculations'
import Step1Parties    from './steps/Step1Parties'
import Step3Vehicle    from './steps/Step3Vehicle'
import Step4Financials from './steps/Step4Financials'
import Step5Review     from './steps/Step5Review'
import Step5Signatures from './steps/Step5Signatures'
import { ChevronLeft, ChevronRight, FileDown, Loader2, Check, Save } from 'lucide-react'
import type { VehicleOnOrderSummary } from '@/lib/types'
import clsx from 'clsx'

const STANDARD_STEPS = [
  { id: 1, label: 'Parties',    component: 1 },
  { id: 2, label: 'Vehicle',    component: 2 },
  { id: 3, label: 'Financials', component: 3 },
  { id: 4, label: 'Review',     component: 4 },
  { id: 5, label: 'Signatures', component: 5 },
]

const MASTER_AGREEMENT_STEPS = [
  { id: 1, label: 'Parties',    component: 1 },
  { id: 2, label: 'Review',     component: 4 },
  { id: 3, label: 'Signatures', component: 5 },
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
  leaseType:         'Core',
  contractStructure: 'Closed-End Lease',
  customerType:      'Business',
  vehicleUse:        'Standard Customer Use',

  // Lessee type — starts unset so fields are hidden until user picks
  lesseeType:      '',
  lesseeFirstName: '',
  lesseeLastName:  '',
  location:        '',

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

interface VehiclePrefill { vin: string; year: string; make: string; model: string }

export default function LeaseForm({
  vehiclePrefill,
  editRecord,
  onEditComplete,
  isMasterLease,
  masterLeaseVehicles,
  isMasterLeaseAgreement,
}: {
  vehiclePrefill?:          VehiclePrefill | null
  editRecord?:              LeaseRecord    | null
  onEditComplete?:          () => void
  isMasterLease?:           boolean
  masterLeaseVehicles?:     VehicleOnOrderSummary[]
  isMasterLeaseAgreement?:  boolean
}) {
  const router = useRouter()
  const [step, setStep]       = useState(1)
  const [saving, setSaving]         = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved]   = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [done, setDone]             = useState(false)

  const form = useForm<LeaseFormData>({
    defaultValues: {
      ...DEFAULT_VALUES,
      ...(editRecord    ? recordToFormData(editRecord) : {}),
      ...(vehiclePrefill ? {
        vin:   vehiclePrefill.vin,
        year:  vehiclePrefill.year,
        make:  vehiclePrefill.make,
        model: vehiclePrefill.model,
      } : {}),
      ...(isMasterLease ? {
        is_master_lease: true,
        vehicles_json:   JSON.stringify(masterLeaseVehicles ?? []),
        // Placeholder vehicle fields so form doesn't fail required validation
        condition: 'NEW',
        vin:       masterLeaseVehicles?.[0]?.vin ?? '',
        year:      masterLeaseVehicles?.[0]?.model_year ?? '',
        make:      masterLeaseVehicles?.[0]?.oem ?? '',
        model:     masterLeaseVehicles?.[0]?.vehicle_line ?? '',
        bodyStyle: '',
      } : {}),
    },
    mode: 'onTouched',
  })

  const activeSteps = isMasterLeaseAgreement ? MASTER_AGREEMENT_STEPS : STANDARD_STEPS

  // ── Free navigation: click any step to jump ──────────────────────────────
  function goToStep(target: number) {
    setStep(target)
  }

  async function handleNext() {
    setStep((s) => Math.min(s + 1, activeSteps.length))
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

      lessee_name:           raw.lesseeType === 'individual'
                               ? `${raw.lesseeFirstName ?? ''} ${raw.lesseeLastName ?? ''}`.trim()
                               : raw.lesseeName ?? '',
      lessee_type:           raw.lesseeType || 'business',
      lessee_first_name:     raw.lesseeFirstName  || null,
      lessee_last_name:      raw.lesseeLastName   || null,
      lessee_location:       raw.location         || null,
      lessee_address:        raw.address,
      lessee_city:           raw.city,
      lessee_state:          (raw.state ?? '').toUpperCase(),
      lessee_zip:            raw.zip,
      lessee_phone:          raw.phone || null,
      lessee_email:          raw.email,

      lease_date:            raw.leaseDate,
      lease_type:            raw.leaseType         || null,
      contract_structure:    raw.contractStructure || null,
      customer_type:         raw.customerType      || null,
      vehicle_use:           raw.vehicleUse        || null,
      department:            raw.department        || null,
      department_other:      raw.departmentOther   || null,

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

      is_master_lease: raw.is_master_lease ?? false,
      vehicles_json:   raw.vehicles_json   || null,
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
      const raw     = form.getValues()
      const payload = buildPayload(raw)

      // PATCH existing record when editing, POST new record otherwise
      const saveRes = editRecord
        ? await fetch(`/api/leases/${editRecord.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          })
        : await fetch('/api/leases', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          })

      const saved = await saveRes.json() as LeaseRecord & { error?: string }
      if (!saveRes.ok) throw new Error(saved.error ?? (editRecord ? 'Update failed' : 'Save failed'))

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

      if (editRecord) {
        onEditComplete?.()
      } else {
        setDone(true)
      }
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
        {activeSteps.map((s, i) => {
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
              {i < activeSteps.length - 1 && (
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
        {(() => {
          const activeComponent = activeSteps[step - 1].component
          return (
            <>
              {activeComponent === 1 && <Step1Parties    form={form} />}
              {activeComponent === 2 && <Step3Vehicle    form={form} prefilled={!!vehiclePrefill} isMasterLease={isMasterLease} />}
              {activeComponent === 3 && <Step4Financials form={form} isMasterLease={isMasterLease} />}
              {activeComponent === 4 && <Step5Review     form={form} isMasterLease={isMasterLease} isMasterLeaseAgreement={isMasterLeaseAgreement} />}
              {activeComponent === 5 && <Step5Signatures form={form} />}
            </>
          )
        })()}
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

          {step < activeSteps.length && (
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
