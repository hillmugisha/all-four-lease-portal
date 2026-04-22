'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, GripVertical } from 'lucide-react'

export interface ColModalDef {
  key:   string
  label: string
}

interface Props {
  allColumns:  ColModalDef[]             // every possible column, in canonical order
  defaultCols: string[]                  // keys for the Reset action
  visible:     string[]                  // currently visible keys (ordered)
  onApply:     (cols: string[]) => void
  onClose:     () => void
}

export default function OrganizeColumnsModal({
  allColumns, defaultCols, visible, onApply, onClose,
}: Props) {
  const [draft, setDraft]         = useState<string[]>(visible)
  const [colSearch, setColSearch] = useState('')
  const dragIdx                   = useRef<number | null>(null)
  const dragOverIdx               = useRef<number | null>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const selectedDefs  = draft.map((k) => allColumns.find((c) => c.key === k)!).filter(Boolean)
  const visibleSet    = new Set(draft)
  const availableDefs = allColumns.filter(
    (c) => !visibleSet.has(c.key) && c.label.toLowerCase().includes(colSearch.toLowerCase())
  )

  function remove(key: string) { setDraft((d) => d.filter((k) => k !== key)) }
  function add(key: string)    { setDraft((d) => [...d, key]); setColSearch('') }
  function deselectAll()       { setDraft([]) }
  function selectAll()         { setDraft(allColumns.map((c) => c.key)) }
  function reset()             { setDraft(defaultCols) }

  function onDragStart(idx: number) { dragIdx.current = idx }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    dragOverIdx.current = idx
  }

  function onDrop() {
    const from = dragIdx.current
    const to   = dragOverIdx.current
    if (from === null || to === null || from === to) return
    setDraft((d) => {
      const next = [...d]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    dragIdx.current     = null
    dragOverIdx.current = null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full max-w-2xl max-h-[85vh] rounded-xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Organize Columns</h2>
            <p className="text-xs text-gray-500 mt-0.5">{draft.length} of {allColumns.length} columns selected</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search columns…"
              value={colSearch}
              onChange={(e) => setColSearch(e.target.value)}
              className="input pl-7 py-1.5 text-sm w-full"
            />
            {colSearch && (
              <button onClick={() => setColSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Two panels */}
        <div className="flex flex-1 min-h-0 divide-x divide-gray-200">

          {/* Left: Selected Fields */}
          <div className="flex flex-col w-1/2 min-h-0">
            <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Selected Fields
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-brand-600 text-white text-[10px] font-bold w-4 h-4">
                  {draft.length}
                </span>
              </span>
              <button onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
                Deselect All
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto py-1">
              {selectedDefs.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-400">No columns selected</li>
              )}
              {selectedDefs.map((col, idx) => (
                <li
                  key={col.key}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDrop={onDrop}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-default group"
                >
                  <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400 cursor-grab shrink-0" />
                  <span className="text-xs text-gray-500 w-4 shrink-0 text-right">{idx + 1}</span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{col.label}</span>
                  <button
                    onClick={() => remove(col.key)}
                    className="shrink-0 rounded p-0.5 text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Available Fields */}
          <div className="flex flex-col w-1/2 min-h-0">
            <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Available Fields
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold w-4 h-4">
                  {allColumns.length - draft.length}
                </span>
              </span>
              <button onClick={selectAll} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
                Select All
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto py-1">
              {availableDefs.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-400">
                  {colSearch ? 'No columns match your search' : 'All columns are selected'}
                </li>
              )}
              {availableDefs.map((col) => (
                <li
                  key={col.key}
                  onClick={() => add(col.key)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-brand-50 cursor-pointer group"
                >
                  <span className="flex-1 text-sm text-gray-700 group-hover:text-brand-700 truncate">{col.label}</span>
                  <span className="shrink-0 text-xs text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">+ Add</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-sm py-1.5 px-4">
              Cancel
            </button>
            <button
              onClick={() => { onApply(draft); onClose() }}
              className="btn-primary text-sm py-1.5 px-4"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
