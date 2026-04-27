'use client'

import { useRef, useState } from 'react'
import { Upload, Trash2 } from 'lucide-react'

interface Props {
  file: File | null
  onChange: (file: File | null) => void
}

const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

function isXlsx(f: File) {
  return (
    f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    f.name.toLowerCase().endsWith('.xlsx')
  )
}

export default function XlsxFileInput({ file, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError]          = useState('')
  const fileInputRef               = useRef<HTMLInputElement>(null)

  function acceptFile(f: File) {
    if (!isXlsx(f)) { setError('Please upload an XLSX file.'); return }
    if (f.size > MAX_BYTES) { setError('File must be 100 MB or smaller.'); return }
    setError('')
    onChange(f)
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true) }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setIsDragging(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }

  function handleRemove() {
    onChange(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function fmt(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      {file ? (
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="flex-1 text-xs text-gray-700 truncate" title={file.name}>{file.name}</span>
          <span className="shrink-0 text-xs text-gray-400">{fmt(file.size)}</span>
          <button
            type="button"
            onClick={handleRemove}
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
            Drag and drop or{' '}
            <span className="font-medium text-brand-600">browse</span>
          </p>
          <p className="text-xs text-gray-400">XLSX · Max 100 MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f) }}
        className="hidden"
      />

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </>
  )
}
