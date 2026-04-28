'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

export default function MultiSelectFilter({
  label, selected, onChange, options,
}: {
  label: string
  selected: string[]
  onChange: (v: string[]) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggleOption(opt: string) {
    selected.includes(opt) ? onChange(selected.filter((s) => s !== opt)) : onChange([...selected, opt])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          open ? 'border-brand-500 bg-white text-gray-900 shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        )}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white leading-none">
            {selected.length}
          </span>
        )}
        <ChevronDown size={13} className={clsx('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50">
            <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600" />
            <span className="text-sm text-gray-700">All</span>
          </label>
          {options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600" />
              <span className="text-sm text-gray-700 whitespace-nowrap">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
