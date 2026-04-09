'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { LeaseFormData, FinancialInputs } from '@/lib/types'
import { calculateLease } from '@/lib/calculations'
import { Plus, Trash2, Eye, X, Loader2 } from 'lucide-react'

interface Props {
  form: UseFormReturn<LeaseFormData>
}

export default function Step5Signatures({ form }: Props) {
  const { register, control, watch, setValue, formState: { errors } } = form

  const [multiple, setMultiple] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lesseeSignatories',
  })

  // Pre-populate first signatory from lessee info if blank
  useEffect(() => {
    const sigs = form.getValues('lesseeSignatories')
    if (!sigs?.[0]?.firstName && !sigs?.[0]?.email) {
      const lesseeName = form.getValues('lesseeName') ?? ''
      const email = form.getValues('email') ?? ''
      const parts = lesseeName.trim().split(/\s+/)
      setValue('lesseeSignatories.0.firstName', parts[0] ?? '')
      setValue('lesseeSignatories.0.lastName', parts.slice(1).join(' '))
      setValue('lesseeSignatories.0.email', email)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleMultipleChange(val: boolean) {
    setMultiple(val)
    // If switching back to single, remove all extra signatories
    if (!val) {
      const current = form.getValues('lesseeSignatories')
      for (let i = current.length - 1; i > 0; i--) remove(i)
    }
  }

  async function handlePreview() {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const raw = form.getValues()

      const fi: FinancialInputs = {
        leaseDate:             raw.leaseDate,
        numPayments:           Number(raw.numPayments),
        firstPaymentDate:      raw.firstPaymentDate,
        paymentDay:            Number(raw.paymentDay),
        vehicleAgreedValue:    Number(raw.vehicleAgreedValue),
        taxes:                 Number(raw.taxes),
        titleRegFees:          Number(raw.titleRegFees),
        acquisitionFee:        Number(raw.acquisitionFee),
        docFee:                Number(raw.docFee),
        priorLeaseBalance:     Number(raw.priorLeaseBalance ?? 0),
        optionalProducts:      Number(raw.optionalProducts ?? 0),
        capCostReduction:      Number(raw.capCostReduction ?? 0),
        residualValue:         Number(raw.residualValue),
        rentCharge:            Number(raw.rentCharge),
        monthlySalesTax:       Number(raw.monthlySalesTax ?? 0),
        milesPerYear:          Number(raw.milesPerYear),
        excessMileageRate:     Number(raw.excessMileageRate),
        dispositionFee:        Number(raw.dispositionFee ?? 195),
        earlyTerminationFee:   Number(raw.earlyTerminationFee ?? 0),
        purchaseOptionFee:     Number(raw.purchaseOptionFee ?? 0),
        tradeinYear:           raw.tradeinYear ?? '',
        tradeinMake:           raw.tradeinMake ?? '',
        tradeinModel:          raw.tradeinModel ?? '',
        tradeinGrossAllowance: Number(raw.tradeinGrossAllowance ?? 0),
        tradeinPriorBalance:   Number(raw.tradeinPriorBalance ?? 0),
        customerSignerName:    raw.customerSignerName ?? '',
        customerSignerEmail:   raw.customerSignerEmail ?? '',
      }
      const c = calculateLease(fi)

      const primary = raw.lesseeSignatories?.[0]
      const lesseePrimaryName = primary
        ? `${primary.firstName} ${primary.lastName}`.trim()
        : raw.lesseeName

      const coLessee = raw.lesseeSignatories?.[1]
      const coLesseeName = coLessee
        ? `${coLessee.firstName} ${coLessee.lastName}`.trim() || null
        : null

      const record = {
        id: 'preview',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'generated' as const,

        lessor_name:    raw.lessorName,
        lessor_address: raw.lessorAddress,
        lessor_po_box:  raw.lessorPoBox || null,
        lessor_city:    raw.lessorCity,
        lessor_state:   raw.lessorState?.toUpperCase() ?? '',
        lessor_zip:     raw.lessorZip,

        lessee_name:    raw.lesseeName,
        lessee_address: raw.address,
        lessee_city:    raw.city,
        lessee_state:   raw.state?.toUpperCase() ?? '',
        lessee_zip:     raw.zip,
        lessee_phone:   raw.phone || null,
        lessee_email:   raw.email,

        lease_date: raw.leaseDate,

        vehicle_condition:  raw.condition,
        vehicle_year:       raw.year,
        vehicle_make:       raw.make,
        vehicle_model:      raw.model,
        vehicle_body_style: raw.bodyStyle,
        vehicle_vin:        raw.vin ? raw.vin.toUpperCase() : '',
        vehicle_odometer:   raw.odometer || null,

        vehicle_agreed_value:  fi.vehicleAgreedValue,
        taxes:                 fi.taxes,
        title_reg_fees:        fi.titleRegFees,
        acquisition_fee:       fi.acquisitionFee,
        doc_fee:               fi.docFee,
        prior_lease_balance:   fi.priorLeaseBalance,
        optional_products:     fi.optionalProducts,
        cap_cost_reduction:    fi.capCostReduction,
        residual_value:        fi.residualValue,
        rent_charge:           fi.rentCharge,
        num_payments:          fi.numPayments,
        monthly_sales_tax:     fi.monthlySalesTax,
        first_payment_date:    fi.firstPaymentDate,
        payment_day:           fi.paymentDay,
        miles_per_year:        fi.milesPerYear,
        excess_mileage_rate:   fi.excessMileageRate,
        disposition_fee:       fi.dispositionFee,
        early_termination_fee: fi.earlyTerminationFee,
        purchase_option_fee:   fi.purchaseOptionFee,

        tradein_year:            raw.tradeinYear || null,
        tradein_make:            raw.tradeinMake || null,
        tradein_model:           raw.tradeinModel || null,
        tradein_gross_allowance: fi.tradeinGrossAllowance,
        tradein_prior_balance:   fi.tradeinPriorBalance,

        gross_cap_cost:               c.grossCapCost,
        net_tradein_allowance:         c.netTradeinAllowance,
        adjusted_cap_cost:            c.adjustedCapCost,
        depreciation:                 c.depreciation,
        total_base_monthly_payments:  c.totalBaseMonthlyPayments,
        base_monthly_payment:         c.baseMonthlyPayment,
        total_monthly_payment:        c.totalMonthlyPayment,
        total_of_payments:            c.totalOfPayments,
        amount_due_at_signing:        c.amountDueAtSigning,
        official_fees_taxes:          c.officialFeesTaxes,

        customer_signer_name:  lesseePrimaryName,
        customer_signer_email: primary?.email ?? raw.email,
        co_lessee_signer_name: coLesseeName,
        lessor_signer_name:    raw.lessorSignatoryName || null,

        docusign_envelope_id: null,
        signed_at:            null,
      }

      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      })
      if (!res.ok) throw new Error('Failed to generate preview')

      const blob = await res.blob()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
      setShowPreview(true)
    } catch (e) {
      setPreviewError(String(e))
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePreview() {
    setShowPreview(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Signatures</h2>
        <p className="mt-1 text-sm text-gray-500">
          This agreement will be sent to the customer via DocuSign for signature.
        </p>
      </div>

      <div className="space-y-5">

        {/* ── Lessee Signatories ─────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Lessee Signatories</h3>

          {/* Multiple signatories question */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Will there be multiple lessee signatories?
            </p>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="multipleLesseeSignatories"
                  checked={!multiple}
                  onChange={() => handleMultipleChange(false)}
                  className="accent-brand-600"
                />
                No
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="multipleLesseeSignatories"
                  checked={multiple}
                  onChange={() => handleMultipleChange(true)}
                  className="accent-brand-600"
                />
                Yes
              </label>
            </div>
          </div>

          {/* Signatory fields */}
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {index === 0 ? 'Primary Lessee Signatory' : `Additional Signatory ${index + 1}`}
                  </p>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      aria-label="Remove signatory"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">First Name <span className="req">*</span></label>
                    <input
                      {...register(`lesseeSignatories.${index}.firstName`, { required: 'Required' })}
                      className="input"
                      placeholder="John"
                    />
                    {errors.lesseeSignatories?.[index]?.firstName && (
                      <p className="field-error">{errors.lesseeSignatories[index]!.firstName!.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Last Name <span className="req">*</span></label>
                    <input
                      {...register(`lesseeSignatories.${index}.lastName`, { required: 'Required' })}
                      className="input"
                      placeholder="Smith"
                    />
                    {errors.lesseeSignatories?.[index]?.lastName && (
                      <p className="field-error">{errors.lesseeSignatories[index]!.lastName!.message}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Email <span className="req">*</span></label>
                    <input
                      {...register(`lesseeSignatories.${index}.email`, {
                        required: 'Required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Enter a valid email address',
                        },
                      })}
                      type="email"
                      className="input"
                      placeholder="john.smith@example.com"
                    />
                    {errors.lesseeSignatories?.[index]?.email && (
                      <p className="field-error">{errors.lesseeSignatories[index]!.email!.message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {multiple && (
            <button
              type="button"
              onClick={() => append({ firstName: '', lastName: '', email: '' })}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              <Plus size={15} />
              Add Signatory
            </button>
          )}
        </div>

        {/* ── Lessor Signatory ───────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Lessor Signatory</h3>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Company Signatory
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Name <span className="req">*</span></label>
                <input
                  {...register('lessorSignatoryName', { required: 'Required' })}
                  className="input"
                  placeholder="Jim Liverseed"
                />
                {errors.lessorSignatoryName && (
                  <p className="field-error">{errors.lessorSignatoryName.message}</p>
                )}
              </div>
              <div>
                <label className="label">Email <span className="req">*</span></label>
                <input
                  {...register('lessorSignatoryEmail', {
                    required: 'Required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                  type="email"
                  className="input"
                  placeholder="jim.liverseed@pritchards.com"
                />
                {errors.lessorSignatoryEmail && (
                  <p className="field-error">{errors.lessorSignatoryEmail.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview button ─────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-gray-100">
        {previewError && (
          <p className="mb-3 text-sm text-red-600">{previewError}</p>
        )}
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewLoading}
          className="inline-flex items-center gap-2 rounded-md border border-yellow-400 bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900 shadow-sm hover:bg-yellow-300 hover:border-yellow-300 disabled:opacity-50 transition-colors"
        >
          {previewLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating Preview…
            </>
          ) : (
            <>
              <Eye size={15} />
              Preview Lease Agreement
            </>
          )}
        </button>
      </div>

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between bg-white px-6 py-4 shadow-sm shrink-0">
            <h3 className="text-base font-semibold text-gray-900">Lease Agreement Preview</h3>
            <button
              type="button"
              onClick={closePreview}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* PDF iframe */}
          <div className="flex-1 bg-gray-100 overflow-hidden">
            <iframe
              src={previewUrl}
              className="h-full w-full"
              title="Lease Agreement Preview"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 bg-white px-6 py-4 shadow-[0_-1px_3px_rgba(0,0,0,0.08)] shrink-0">
            <button type="button" onClick={closePreview} className="btn-secondary">
              Close
            </button>
            <button
              type="button"
              onClick={() => { /* DocuSign integration — Phase 2 */ }}
              className="btn-primary"
            >
              Sign with DocuSign
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
