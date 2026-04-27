'use client'

import { useRef, useState } from 'react'
import { Upload, Eye, Trash2, AlertTriangle, X } from 'lucide-react'

interface Props {
  file: File | null
  onChange: (file: File | null) => void
  required?: boolean
}

function PdfPreviewModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full max-w-4xl rounded-xl bg-gray-900 shadow-2xl" style={{ height: '88vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-medium text-gray-200 truncate max-w-[80%]">{name}</span>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <iframe src={url} className="flex-1 w-full border-0 rounded-b-xl" title={name} />
      </div>
    </div>
  )
}

function DeleteConfirmModal({ fileName, onConfirm, onCancel }: {
  fileName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-900">Remove Document</span>
          </div>
          <button onClick={onCancel} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">Are you sure you want to remove this document?</p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="text-xs text-gray-500 break-all">
              <span className="text-gray-400">File: </span>{fileName}
            </p>
          </div>
          <p className="text-xs font-medium text-red-600">The file will be removed from this form.</p>
        </div>
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PdfFileInput({ file, onChange, required }: Props) {
  const [isDragging,        setIsDragging]        = useState(false)
  const [showPreview,       setShowPreview]        = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm]  = useState(false)
  const [previewUrl,        setPreviewUrl]         = useState<string | null>(null)
  const [error,             setError]              = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  function acceptFile(f: File) {
    if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }
    setError('')
    onChange(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) acceptFile(dropped)
  }

  function handleView() {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setShowPreview(true)
  }

  function handleClosePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setShowPreview(false)
  }

  function handleConfirmRemove() {
    onChange(null)
    setShowDeleteConfirm(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      {showPreview && previewUrl && (
        <PdfPreviewModal url={previewUrl} name={file!.name} onClose={handleClosePreview} />
      )}
      {showDeleteConfirm && file && (
        <DeleteConfirmModal
          fileName={file.name}
          onConfirm={handleConfirmRemove}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {file ? (
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
          <span className="flex-1 text-xs text-gray-700 truncate" title={file.name}>
            {file.name}
          </span>
          <button
            type="button"
            onClick={handleView}
            className="shrink-0 rounded p-0.5 text-green-600 hover:bg-green-50 transition-colors"
            title="Preview"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 rounded p-0.5 text-red-500 hover:bg-red-50 transition-colors"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
            isDragging
              ? 'border-brand-400 bg-brand-50'
              : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
          }`}
        >
          <Upload size={22} className={isDragging ? 'text-brand-500' : 'text-gray-400'} />
          <p className="text-sm text-gray-600 text-center">
            Drag & drop your PDF here, or{' '}
            <span className="font-medium text-brand-600">choose a file</span>
          </p>
          <p className="text-xs text-gray-400">PDF only</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f) }}
        className="hidden"
        required={required && !file}
      />

      {error && <p className="field-error mt-1">{error}</p>}
    </>
  )
}
