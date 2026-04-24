'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Loader2, Send, CheckCircle, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PdfViewerModal } from '@/components/PdfViewerModal'
import type { LeaseRecord } from '@/lib/types'
import type { LeaseScheduleFormData } from '@/lib/lease-schedule-types'

interface Props {
  form: UseFormReturn<LeaseScheduleFormData>
}

export default function LeaseScheduleStep4Signatures({ form }: Props) {
  const router = useRouter()
  const { register, control, watch, setValue, formState: { errors } } = form

  const [multiple, setMultiple]         = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError]     = useState<string | null>(null)
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null)
  const [previewRecord, setPreviewRecord]   = useState<LeaseRecord | null>(null)
  const [sending, setSending]           = useState(false)
  const [sendError, setSendError]       = useState<string | null>(null)
  const [sentEnvelopeId, setSentEnvelopeId] = useState<string | null>(null)

  const { fields, append, remove } = useFieldArray({ control, name: 'lesseeSignatories' })

  const lesseeType      = watch('lesseeType') ?? 'business'
  const lesseeName      = watch('lesseeName') ?? ''
  const lesseeFirstName = watch('lesseeFirstName') ?? ''
  const lesseeLastName  = watch('lesseeLastName')  ?? ''
  const lesseeDisplayName = lesseeType === 'individual'
    ? `${lesseeFirstName} ${lesseeLastName}`.trim()
    : lesseeName

  useEffect(() => {
    const sigs = form.getValues('lesseeSignatories')
    if (!sigs?.[0]?.firstName && !sigs?.[0]?.email) {
      const type  = form.getValues('lesseeType') ?? 'business'
      const email = form.getValues('email') ?? ''
      if (type === 'individual') {
        setValue('lesseeSignatories.0.firstName', form.getValues('lesseeFirstName') ?? '')
        setValue('lesseeSignatories.0.lastName',  form.getValues('lesseeLastName')  ?? '')
        setValue('lesseeSignatories.0.email', email)
      } else {
        setValue('lesseeSignatories.0.email', email)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleMultipleChange(val: boolean) {
    setMultiple(val)
    if (!val) {
      const current = form.getValues('lesseeSignatories')
      for (let i = current.length - 1; i > 0; i--) remove(i)
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewRecord(null)
  }

  async function handlePreview() {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const formData = form.getValues()
      const res = await fetch('/api/generate-lease-schedule-pdf', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ formData }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Failed to generate PDF')
      }
      const blob = await res.blob()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const url = URL.createObjectURL(blob)
      const lesseeName = lesseeDisplayName || 'preview'
      const fake = {
        id:                   'preview',
        lessee_name:          lesseeName,
        vehicle_vin:          formData.vehicles?.[0]?.vin ?? null,
        docusign_envelope_id: null,
        doc_status:           'generated' as const,
      } as unknown as LeaseRecord
      setPreviewUrl(url)
      setPreviewRecord(fake)
    } catch (e) {
      setPreviewError(String(e))
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSend() {
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/send-lease-schedule-to-docusign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ formData: form.getValues() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to send to DocuSign')
      setSentEnvelopeId(json.envelopeId)
    } catch (e) {
      setSendError(String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Signatures</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review signatory details, preview the Lease Schedule, then send for signature via DocuSign.
        </p>
      </div>

      <div className="space-y-5">

        {/* ── Lessee Signatories ─────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Lessee Signatories</h3>

          <div className="rounded-lg border border-[#D6E4FF] bg-[#F5F9FF] px-4 py-3 mb-4 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {lesseeType === 'individual' ? 'Individual' : 'Business'}
            </span>
            <span className="text-sm text-gray-700 font-medium">
              {lesseeDisplayName || <span className="text-gray-400 italic">No lessee name entered</span>}
            </span>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Will there be multiple lessee signatories?
            </p>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="ls-multiple-sig"
                  checked={!multiple}
                  onChange={() => handleMultipleChange(false)}
                  className="accent-brand-600"
                />
                No
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="ls-multiple-sig"
                  checked={multiple}
                  onChange={() => handleMultipleChange(true)}
                  className="accent-brand-600"
                />
                Yes
              </label>
            </div>
          </div>

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
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
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
              <Plus size={15} /> Add Signatory
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
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
              <div>
                <label className="label">Email <span className="req">*</span></label>
                <input
                  {...register('lessorSignatoryEmail', {
                    required: 'Required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
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
          {previewLoading
            ? <><Loader2 size={15} className="animate-spin" /> Generating Preview…</>
            : <><FileText size={15} /> Preview Lease Schedule</>
          }
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !!sentEnvelopeId}
          className="btn-primary"
        >
          {sending
            ? <><Loader2 size={15} className="animate-spin" /> Sending to DocuSign…</>
            : <><Send size={15} /> Send for Signature</>
          }
        </button>
        {previewError && (
          <p className="w-full text-sm text-red-600">{previewError}</p>
        )}
        {sendError && (
          <p className="w-full text-sm text-red-600">{sendError}</p>
        )}
      </div>

      {/* ── Preview modal ─────────────────────────────────────────────────── */}
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
              Each signatory will receive an email from DocuSign with a link to review and sign the Lease Schedule.
            </p>
            <p className="text-xs text-green-600 mt-1 font-mono">Envelope ID: {sentEnvelopeId}</p>
            <button
              type="button"
              onClick={() => router.push('/vehicles-on-order')}
              className="mt-3 text-xs font-medium text-green-700 underline hover:text-green-900 transition-colors"
            >
              Back to Vehicles on Order →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
