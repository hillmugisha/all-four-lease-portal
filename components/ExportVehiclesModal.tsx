'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp, Download, Minus } from 'lucide-react'
import * as XLSX from 'xlsx'

// ─── Generic column / group types ────────────────────────────────────────────

export interface ExportCol<T> {
  label:     string
  key?:      keyof T                 // direct property access on the record
  getValue?: (record: T) => unknown  // custom accessor (e.g. nested app_data fields)
}

export interface ColGroup<T> {
  name:     string
  required: boolean
  cols:     ExportCol<T>[]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props<T> {
  open:       boolean
  onClose:    () => void
  records:    T[]
  groups:     ColGroup<T>[]
  filename:   string    // base filename without extension, e.g. 'lease-portfolio'
  sheetName?: string    // defaults to 'Export'
}

export default function ExportVehiclesModal<T>({ open, onClose, records, groups, filename, sheetName = 'Export' }: Props<T>) {
  const allOptionalLabels: string[] = groups.flatMap((g) =>
    g.required ? [] : g.cols.map((c) => c.label)
  )

  const [checked,  setChecked]  = useState<Set<string>>(new Set(allOptionalLabels))
  const [expanded, setExpanded] = useState<Set<string>>(new Set(groups.map((g) => g.name)))

  if (!open) return null

  const allChecked  = checked.size === allOptionalLabels.length
  const noneChecked = checked.size === 0
  const partial     = !allChecked && !noneChecked

  function toggleSelectAll() {
    setChecked(allChecked ? new Set() : new Set(allOptionalLabels))
  }

  function groupState(group: ColGroup<T>): 'all' | 'none' | 'partial' {
    if (group.required) return 'all'
    const labels = group.cols.map((c) => c.label)
    const n = labels.filter((l) => checked.has(l)).length
    if (n === 0) return 'none'
    if (n === labels.length) return 'all'
    return 'partial'
  }

  function toggleGroup(group: ColGroup<T>) {
    if (group.required) return
    const labels = group.cols.map((c) => c.label)
    const state  = groupState(group)
    setChecked((prev) => {
      const next = new Set(prev)
      if (state === 'all') labels.forEach((l) => next.delete(l))
      else labels.forEach((l) => next.add(l))
      return next
    })
  }

  function toggleCol(label: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function toggleExpanded(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function handleExport() {
    const exportCols: ExportCol<T>[] = [
      ...groups.filter((g) => g.required).flatMap((g) => g.cols),
      ...groups.filter((g) => !g.required).flatMap((g) =>
        g.cols.filter((c) => checked.has(c.label))
      ),
    ]

    const rows = records.map((r) => {
      const row: Record<string, unknown> = {}
      for (const col of exportCols) {
        row[col.label] = col.getValue
          ? col.getValue(r)
          : col.key != null ? (r[col.key] ?? '') : ''
      }
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full max-w-2xl rounded-xl bg-white shadow-2xl" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Export to Excel</h2>
            <p className="text-xs text-gray-400 mt-0.5">{records.length} record{records.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Column picker */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-xs font-medium text-gray-700">Please select which columns you want to include in the sheet:</p>

          {/* Select All row */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                allChecked
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : partial
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {partial ? <Minus size={10} strokeWidth={3} /> : allChecked ? <span className="block w-2 h-2 bg-white rounded-sm" /> : null}
            </button>
            <span className="text-xs font-medium text-gray-700">Select All</span>
          </div>

          {/* Groups */}
          {groups.map((group) => {
            const state  = groupState(group)
            const isOpen = expanded.has(group.name)

            return (
              <div key={group.name} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 cursor-pointer select-none"
                  onClick={() => toggleExpanded(group.name)}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleGroup(group) }}
                    disabled={group.required}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      group.required
                        ? 'border-gray-300 bg-gray-200 cursor-not-allowed'
                        : state === 'all'
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : state === 'partial'
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {state === 'partial' ? (
                      <Minus size={10} strokeWidth={3} className="text-white" />
                    ) : state === 'all' ? (
                      <span className="block w-2 h-2 bg-white rounded-sm" />
                    ) : null}
                  </button>
                  <span className="flex-1 text-xs font-semibold text-gray-800">{group.name}</span>
                  {group.required && (
                    <span className="text-xs text-gray-400 font-normal">(Required)</span>
                  )}
                  {isOpen ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                </div>

                {isOpen && (
                  <div className="px-3 py-2.5 grid grid-cols-3 gap-x-4 gap-y-2">
                    {group.cols.map((col) => {
                      const isChecked = group.required || checked.has(col.label)
                      return (
                        <label
                          key={col.label}
                          className={`flex items-center gap-1.5 ${group.required ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={group.required}
                            onChange={() => !group.required && toggleCol(col.label)}
                            className={`h-3.5 w-3.5 rounded border-gray-300 ${
                              group.required
                                ? 'accent-gray-400 cursor-not-allowed'
                                : 'accent-brand-600 cursor-pointer'
                            }`}
                          />
                          <span className={`text-xs ${group.required ? 'text-gray-400' : 'text-gray-700'}`}>
                            {col.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleExport} className="btn-primary flex items-center gap-1.5">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
