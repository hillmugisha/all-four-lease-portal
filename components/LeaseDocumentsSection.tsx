'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Eye, Trash2, Plus, Upload, AlertTriangle, X } from 'lucide-react'

type DocType = 'lease_agreement' | 'finance_document' | 'other'
type TableName = 'leases' | 'pritchard_lease_portfolio'

interface LeaseDoc {
  id: string
  lease_id: string
  table_name: TableName
  doc_type: DocType
  file_name: string
  storage_path: string
  created_at: string
}

const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: 'lease_agreement',  label: 'Lease Agreement' },
  { key: 'finance_document', label: 'Finance Document' },
  { key: 'other',            label: 'Other' },
]

// ─── Delete confirmation modal ────────────────────────────────────────────────

function DeleteConfirmModal({
  doc, docLabel, onConfirm, onCancel, deleting,
}: {
  doc: LeaseDoc
  docLabel: string
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-900">Delete Document</span>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this document?
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-0.5">
            <p className="text-xs font-semibold text-gray-700">{docLabel}</p>
            <p className="text-xs text-gray-500 break-all">
              <span className="text-gray-400">File: </span>{doc.file_name}
            </p>
          </div>
          <p className="text-xs font-medium text-red-600">This action cannot be undone.</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Single upload card ───────────────────────────────────────────────────────

function DocUploadCard({
  label, docType, leaseId, tableName, docs, onUploaded, onDeleteRequest,
}: {
  label: string
  docType: DocType
  leaseId: string
  tableName: TableName
  docs: LeaseDoc[]
  onUploaded: (doc: LeaseDoc) => void
  onDeleteRequest: (doc: LeaseDoc, label: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [dragging,  setDragging]  = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('lease_id',   leaseId)
      fd.append('table_name', tableName)
      fd.append('doc_type',   docType)
      fd.append('file',       file)
      const res = await fetch('/api/lease-documents', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const doc: LeaseDoc = await res.json()
      onUploaded(doc)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }, [leaseId, tableName, docType, onUploaded])

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(uploadFile)
  }

  const handleView = async (doc: LeaseDoc) => {
    try {
      const res = await fetch(`/api/lease-documents/${doc.id}/file`)
      if (!res.ok) throw new Error('Could not get file URL')
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('View failed:', err)
    }
  }

  const isEmpty = docs.length === 0

  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold text-gray-600 mb-1.5">{label}</p>

      <div
        className={[
          'flex-1 rounded-lg border border-dashed transition-colors',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white',
        ].join(' ')}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        {isEmpty ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-1.5 py-6 px-3 text-center cursor-pointer disabled:opacity-50"
          >
            {uploading
              ? <Upload size={20} className="text-blue-400 animate-bounce" />
              : <FileText size={20} className="text-gray-400" />
            }
            <span className="text-xs text-blue-600 hover:underline">
              {uploading ? 'Uploading…' : 'Drag and drop or browse'}
            </span>
          </button>
        ) : (
          <div className="p-2 space-y-1.5">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5"
              >
                <span className="flex-1 text-xs text-gray-700 truncate" title={doc.file_name}>
                  {doc.file_name}
                </span>
                <button
                  type="button"
                  onClick={() => handleView(doc)}
                  className="shrink-0 rounded p-0.5 text-green-600 hover:bg-green-50 transition-colors"
                  title="View"
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRequest(doc, label)}
                  className="shrink-0 rounded p-0.5 text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
            >
              {uploading
                ? <Upload size={12} className="animate-bounce" />
                : <Plus size={12} />
              }
              {uploading ? 'Uploading…' : 'Add another document'}
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function LeaseDocumentsSection({
  leaseId, tableName,
}: { leaseId: string; tableName: TableName }) {
  const [documents,    setDocuments]    = useState<LeaseDoc[]>([])
  const [loading,      setLoading]      = useState(true)
  const [pendingDelete, setPendingDelete] = useState<{ doc: LeaseDoc; label: string } | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/lease-documents?lease_id=${leaseId}&table_name=${tableName}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDocuments(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [leaseId, tableName])

  const handleUploaded = (doc: LeaseDoc) =>
    setDocuments(prev => [...prev, doc])

  const handleDeleteRequest = (doc: LeaseDoc, label: string) =>
    setPendingDelete({ doc, label })

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/lease-documents/${pendingDelete.doc.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Delete failed')
      setDocuments(prev => prev.filter(d => d.id !== pendingDelete.doc.id))
      setPendingDelete(null)
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(false)
    }
  }

  const docsFor = (type: DocType) => documents.filter(d => d.doc_type === type)

  return (
    <>
      {pendingDelete && (
        <DeleteConfirmModal
          doc={pendingDelete.doc}
          docLabel={pendingDelete.label}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDelete(null)}
          deleting={deleting}
        />
      )}

      <div className="mt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Documents
        </h3>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 mb-4">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-4">Loading documents…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {DOC_TYPES.map(({ key, label }) => (
                <DocUploadCard
                  key={key}
                  label={label}
                  docType={key}
                  leaseId={leaseId}
                  tableName={tableName}
                  docs={docsFor(key)}
                  onUploaded={handleUploaded}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
