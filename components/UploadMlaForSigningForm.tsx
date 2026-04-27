'use client'

import { useState } from 'react'
import { ArrowLeft, Send, CheckCircle2, ChevronDown, Eye, X } from 'lucide-react'
import { BUSINESS_NAMES, LESSORS } from '@/lib/business-names'
import StepIndicator, { StepDef } from '@/components/StepIndicator'
import PdfFileInput from '@/components/PdfFileInput'

interface Props {
  onBack: () => void
  onSuccess: () => void
}

const MLA_STEPS: StepDef[] = [
  { id: 1, label: 'Document & Parties' },
  { id: 2, label: 'Review & Send'      },
]

export default function UploadMlaForSigningForm({ onBack, onSuccess }: Props) {
  const [step, setStep] = useState(1)

  const [lesseeName,         setLesseeName]         = useState('')
  const [file,               setFile]               = useState<File | null>(null)
  const [signerName,         setSignerName]         = useState('')
  const [signerEmail,        setSignerEmail]        = useState('')
  const [signerTitle,        setSignerTitle]        = useState('')
  const [lessorName,         setLessorName]         = useState('')
  const [lessorFirstName,    setLessorFirstName]    = useState('')
  const [lessorLastName,     setLessorLastName]     = useState('')
  const [lessorTitle,        setLessorTitle]        = useState('')
  const [lessorEmail,        setLessorEmail]        = useState('')

  const [reviewPreviewUrl, setReviewPreviewUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  function openReviewPreview() {
    if (!file) return
    setReviewPreviewUrl(URL.createObjectURL(file))
  }

  function closeReviewPreview() {
    if (reviewPreviewUrl) URL.revokeObjectURL(reviewPreviewUrl)
    setReviewPreviewUrl(null)
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStep(2)
  }

  async function handleSend() {
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('lessee_name',         lesseeName)
      fd.append('signer_name',         signerName)
      fd.append('signer_email',        signerEmail)
      fd.append('signer_title',        signerTitle)
      fd.append('lessor_name',         lessorName)
      fd.append('lessor_first_name',   lessorFirstName)
      fd.append('lessor_last_name',    lessorLastName)
      fd.append('lessor_title',        lessorTitle)
      fd.append('lessor_email',        lessorEmail)
      fd.append('file', file!)

      const res = await fetch('/api/master-lease-agreements/send-uploaded', {
        method: 'POST',
        body:   fd,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }
      setSent(true)
    } catch (err) {
      setError(String(err))
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-lg py-16 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Sent to DocuSign</h2>
        <p className="text-sm text-gray-500 mb-6">
          The MLA for <strong>{lesseeName}</strong> has been sent to <strong>{signerName}</strong> ({signerEmail}) for signing.
        </p>
        <button type="button" onClick={onSuccess} className="btn-primary">
          Done
        </button>
      </div>
    )
  }

  return (
    <>
    {reviewPreviewUrl && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeReviewPreview} />
        <div className="relative z-10 flex flex-col w-full max-w-4xl rounded-xl bg-gray-900 shadow-2xl" style={{ height: '88vh' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-medium text-gray-200 truncate max-w-[80%]">{file?.name}</span>
            <button onClick={closeReviewPreview} className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors">
              <X size={16} />
            </button>
          </div>
          <iframe src={reviewPreviewUrl} className="flex-1 w-full border-0 rounded-b-xl" title={file?.name} />
        </div>
      </div>
    )}
    <div className="max-w-lg py-10">
      <button
        type="button"
        onClick={step === 1 ? onBack : () => { setStep(1); setError('') }}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={15} />
        {step === 1 ? 'Back' : 'Back to Details'}
      </button>

      <div className="mb-8">
        <StepIndicator
          steps={MLA_STEPS}
          currentStep={step}
          onStepClick={(id) => { if (id < step) { setStep(id); setError('') } }}
        />
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload MLA for Signing</h2>
            <p className="text-sm text-gray-500 mb-2">
              Upload a prepared MLA and send it to the customer via DocuSign.
            </p>
          </div>

          <div>
            <label className="label">
              MLA Document (PDF) <span className="req">*</span>
            </label>
            <PdfFileInput file={file} onChange={setFile} required />
          </div>

          {/* ── Lessee section ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Lessee</p>
            <div className="card p-4 space-y-4">

              <div>
                <label className="label">
                  Business Name <span className="req">*</span>
                </label>
                <div className="relative">
                  <select
                    value={lesseeName}
                    onChange={(e) => setLesseeName(e.target.value)}
                    className="input appearance-none pr-8"
                    required
                  >
                    <option value="">Select a business…</option>
                    {BUSINESS_NAMES.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Primary Signer <span className="req">*</span></p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="input"
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      className="input"
                      placeholder="jane@company.com"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Job Title</label>
                    <input
                      type="text"
                      value={signerTitle}
                      onChange={(e) => setSignerTitle(e.target.value)}
                      className="input"
                      placeholder="Fleet Manager"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Lessor section ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Lessor</p>
            <div className="card p-4 space-y-4">
              <div>
                <label className="label">Lessor Name / Company <span className="req">*</span></label>
                <div className="relative">
                  <select
                    value={lessorName}
                    onChange={(e) => setLessorName(e.target.value)}
                    className="input appearance-none pr-8"
                    required
                  >
                    <option value="" disabled>Select lessor…</option>
                    {LESSORS.map((l) => (
                      <option key={l.name} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Signer <span className="req">*</span></p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      type="text"
                      value={lessorFirstName}
                      onChange={(e) => setLessorFirstName(e.target.value)}
                      className="input"
                      placeholder="Alex"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      type="text"
                      value={lessorLastName}
                      onChange={(e) => setLessorLastName(e.target.value)}
                      className="input"
                      placeholder="Pritchard"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email <span className="req">*</span></label>
                    <input
                      type="email"
                      value={lessorEmail}
                      onChange={(e) => setLessorEmail(e.target.value)}
                      className="input"
                      placeholder="lessor@pritchards.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Title</label>
                    <input
                      type="text"
                      value={lessorTitle}
                      onChange={(e) => setLessorTitle(e.target.value)}
                      className="input"
                      placeholder="Managing Member"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary w-full justify-center">
            Review &rarr;
          </button>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Review & Send</h2>
            <p className="text-sm text-gray-500">Confirm the details before sending to DocuSign.</p>
          </div>

          <div className="card p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-gray-500">Business</dt>
              <dd className="text-gray-900 font-medium">{lesseeName}</dd>

              <dt className="text-gray-500">Document</dt>
              <dd className="flex items-center gap-2">
                <span className="text-gray-900 font-medium truncate">{file?.name}</span>
                <button
                  type="button"
                  onClick={openReviewPreview}
                  className="shrink-0 rounded p-0.5 text-green-600 hover:bg-green-50 transition-colors"
                  title="Preview"
                >
                  <Eye size={14} />
                </button>
              </dd>

              <dt className="text-gray-500">Primary Signer</dt>
              <dd className="text-gray-900 font-medium">
                {signerName}{signerTitle ? `, ${signerTitle}` : ''} — {signerEmail}
              </dd>

              <dt className="text-gray-500">Lessor</dt>
              <dd className="text-gray-900 font-medium">{lessorName}</dd>

              <dt className="text-gray-500">Lessor Signer</dt>
              <dd className="text-gray-900 font-medium">
                {lessorFirstName} {lessorLastName}{lessorTitle ? `, ${lessorTitle}` : ''} — {lessorEmail}
              </dd>
            </dl>
          </div>

          <p className="text-xs text-gray-400">
            A DocuSign envelope will be sent to the signer(s) above. Signature fields are placed at the
            bottom of the last page of the uploaded document.
          </p>

          {error && <p className="field-error">{error}</p>}

          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? 'Sending…' : (
              <>
                <Send size={15} />
                Send to DocuSign
              </>
            )}
          </button>
        </div>
      )}
    </div>
    </>
  )
}
