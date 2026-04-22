'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { LeaseFormData, FinancialInputs, LeaseRecord } from '@/lib/types'
import { calculateLease } from '@/lib/calculations'
import { Plus, Trash2, Loader2, Send, CheckCircle, FileText } from 'lucide-react'
import { PdfViewerModal } from '@/components/PdfViewerModal'

interface Props {
  form: UseFormReturn<LeaseFormData>
}

export default function Step5Signatures({ form }: Props) {
  const { register, control, watch, setValue, formState: { errors } } = form

  const [multiple, setMultiple] = useState(false)
  const [previewRecord, setPreviewRecord] = useState<LeaseRecord | null>(null)
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError]   = useState<string | null>(null)

  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sentEnvelopeId, setSentEnvelopeId] = useState<string | null>(null)
  const [classificationError, setClassificationError] = useState<string | null>(null)

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lesseeSignatories',
  })

  const lesseeType      = watch('lesseeType') ?? 'business'
  const lesseeName      = watch('lesseeName') ?? ''
  const lesseeFirstName = watch('lesseeFirstName') ?? ''
  const lesseeLastName  = watch('lesseeLastName')  ?? ''
  const lesseeDisplayName = lesseeType === 'individual'
    ? `${lesseeFirstName} ${lesseeLastName}`.trim()
    : lesseeType === 'business'
    ? lesseeName
    : ''

  // Pre-populate first signatory from lessee info if blank
  useEffect(() => {
    const sigs = form.getValues('lesseeSignatories')
    if (!sigs?.[0]?.firstName && !sigs?.[0]?.email) {
      const lesseeType = form.getValues('lesseeType') ?? 'business'
      const email = form.getValues('email') ?? ''
      if (lesseeType === 'individual') {
        setValue('lesseeSignatories.0.firstName', form.getValues('lesseeFirstName') ?? '')
        setValue('lesseeSignatories.0.lastName',  form.getValues('lesseeLastName')  ?? '')
        setValue('lesseeSignatories.0.email', email)
      } else {
        // Business: don't try to split company name — only set email
        setValue('lesseeSignatories.0.email', email)
      }
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

  function checkClassification(): boolean {
    const { leaseType, customerType, vehicleUse, department, departmentOther } = form.getValues()
    if (!leaseType)    { setClassificationError('Lease Type is required — go back to Step 1 (Parties) and set it under Lease Classification.'); return false }
    if (!customerType) { setClassificationError('Customer Type is required — go back to Step 1 (Parties) and set it under Lease Classification.'); return false }
    if (!vehicleUse)   { setClassificationError('Vehicle Use is required — go back to Step 1 (Parties) and set it under Lease Classification.'); return false }
    if (customerType === 'Internal' && !department) { setClassificationError('Department is required for Internal leases — go back to Step 1 (Parties) and select a department.'); return false }
    if (customerType === 'Internal' && department === 'Other' && !departmentOther) { setClassificationError('Enter a department name for "Other" — go back to Step 1 (Parties).'); return false }
    setClassificationError(null)
    return true
  }

  async function handleSendToDocuSign() {
    if (!checkClassification()) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/send-to-docusign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: form.getValues() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to send to DocuSign')
      setSentEnvelopeId(json.envelopeId)
      closePreview()
    } catch (e) {
      setSendError(String(e))
    } finally {
      setSending(false)
    }
  }

  async function handlePreview() {
    if (!checkClassification()) return
    setPreviewLoading(true)
    setPreviewError(null)

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

    const lessee_name = raw.lesseeType === 'individual'
      ? `${raw.lesseeFirstName ?? ''} ${raw.lesseeLastName ?? ''}`.trim()
      : raw.lesseeName ?? ''

    const record: LeaseRecord = {
      id: 'preview',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      doc_status: 'generated' as const,

      lessor_name:    raw.lessorName,
      lessor_address: raw.lessorAddress,
      lessor_po_box:  raw.lessorPoBox || null,
      lessor_city:    raw.lessorCity,
      lessor_state:   raw.lessorState?.toUpperCase() ?? '',
      lessor_zip:     raw.lessorZip,

      lessee_name,
      lessee_type:       (raw.lesseeType || 'business') as 'business' | 'individual',
      lessee_first_name: raw.lesseeFirstName  || null,
      lessee_last_name:  raw.lesseeLastName   || null,
      lessee_location:   raw.location         || null,
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
      net_tradein_allowance:        c.netTradeinAllowance,
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
      customer_signer_title: primary?.jobTitle || null,
      co_lessee_signer_name: coLesseeName,
      lessor_signer_name:    raw.lessorSignatoryName || null,
      lessor_signer_title:   raw.lessorSignatoryTitle || null,

      docusign_envelope_id: null,
      signed_at:            null,

      is_master_lease: raw.is_master_lease ?? false,
      vehicles_json:   raw.vehicles_json   || null,
    }

    try {
      const res = await fetch('/api/generate-preview-packet', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ record }),
      })
      if (!res.ok) throw new Error('Failed to generate preview')
      const blob = await res.blob()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
      setPreviewRecord(record)
    } catch (e) {
      setPreviewError(String(e))
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewRecord(null)
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

          {/* Lessee type indicator */}
          <div className="rounded-lg border border-[#D6E4FF] bg-[#F5F9FF] px-4 py-3 mb-4 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {lesseeType === 'individual' ? 'Individual' : 'Business'}
            </span>
            <span className="text-sm text-gray-700 font-medium">
              {lesseeDisplayName || <span className="text-gray-400 italic">No lessee name entered</span>}
            </span>
          </div>

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
                  <div>
                    <label className="label">Job Title</label>
                    <input
                      {...register(`lesseeSignatories.${index}.jobTitle`)}
                      className="input"
                      placeholder="e.g. Fleet Manager"
                    />
                  </div>
                  <div>
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
                <label className="label">Job Title <span className="req">*</span></label>
                <input
                  {...register('lessorSignatoryTitle', { required: 'Required' })}
                  className="input"
                  placeholder="Lease Sales Consultant"
                />
                {errors.lessorSignatoryTitle && (
                  <p className="field-error">{errors.lessorSignatoryTitle.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
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

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-gray-100 flex items-center gap-3 flex-wrap">
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
              <FileText size={15} />
              Preview Lease Documents
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleSendToDocuSign}
          disabled={sending}
          className="btn-primary"
        >
          {sending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Sending to DocuSign…
            </>
          ) : (
            <>
              <Send size={15} />
              Send for Signature
            </>
          )}
        </button>
        {classificationError && (
          <p className="w-full text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {classificationError}
          </p>
        )}
        {previewError && (
          <p className="w-full text-sm text-red-600">{previewError}</p>
        )}
        {sendError && (
          <p className="w-full text-sm text-red-600">{sendError}</p>
        )}
      </div>

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      {previewRecord && previewUrl && (
        <PdfViewerModal
          lease={previewRecord}
          preloadedUrl={previewUrl}
          onClose={closePreview}
        />
      )}

      {/* ── Success banner ────────────────────────────────────────────────── */}
      {sentEnvelopeId && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-4 flex items-start gap-3">
          <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Sent for signature via DocuSign</p>
            <p className="text-xs text-green-700 mt-0.5">
              Each signatory will receive an email from DocuSign with a link to review and sign the lease agreement.
            </p>
            <p className="text-xs text-green-600 mt-1 font-mono">Envelope ID: {sentEnvelopeId}</p>
          </div>
        </div>
      )}
    </div>
  )
}
