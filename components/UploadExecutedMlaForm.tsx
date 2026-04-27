'use client'

import { useState } from 'react'
import { ArrowLeft, Upload, CheckCircle2, Info, ChevronDown } from 'lucide-react'
import { BUSINESS_NAMES } from '@/lib/business-names'
import PdfFileInput from '@/components/PdfFileInput'

interface Props {
  onBack: () => void
  onSuccess: () => void
}

export default function UploadExecutedMlaForm({ onBack, onSuccess }: Props) {
  const [lesseeName,   setLesseeName]   = useState('')
  const [executedDate, setExecutedDate] = useState('')
  const [file,         setFile]         = useState<File | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [saved,        setSaved]        = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lesseeName || !executedDate || !file) {
      setError('All fields are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('lessee_name',   lesseeName)
      fd.append('executed_date', executedDate)
      fd.append('file',          file)
      const res = await fetch('/api/master-lease-agreements/upload-executed', {
        method: 'POST',
        body:   fd,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }
      setSaved(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (saved) {
    return (
      <div className="max-w-lg py-16 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">MLA Saved</h2>
        <p className="text-sm text-gray-500 mb-6">
          The executed Master Lease Agreement for <strong>{lesseeName}</strong> has been recorded.
        </p>
        <button type="button" onClick={onSuccess} className="btn-primary">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg py-10">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload Executed MLA</h2>
      <p className="text-sm text-gray-500 mb-6">
        Record a Master Lease Agreement that was signed offline.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">

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
          <label className="label flex items-center gap-1.5">
            Executed Date <span className="req">*</span>
            <span className="group relative inline-flex">
              <Info size={13} className="text-gray-400 cursor-help" />
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded bg-gray-800 px-2.5 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-normal">
                The date the Master Lease Agreement was activated and signed by all parties.
              </span>
            </span>
          </label>
          <input
            type="date"
            value={executedDate}
            onChange={(e) => setExecutedDate(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">
            Signed Document (PDF) <span className="req">*</span>
          </label>
          <PdfFileInput file={file} onChange={setFile} required />
        </div>

        {error && <p className="field-error">{error}</p>}

        <button
          type="submit"
          disabled={loading || !lesseeName || !executedDate || !file}
          className="btn-primary w-full justify-center"
        >
          {loading ? 'Saving…' : (
            <>
              <Upload size={15} />
              Save Executed MLA
            </>
          )}
        </button>
      </form>
    </div>
  )
}
