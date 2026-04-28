'use client'

import { X, CheckCircle2, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

export interface ToastState { message: string; type: 'success' | 'error' }

interface Props {
  toast: ToastState
  onClose: () => void
}

export default function Toast({ toast, onClose }: Props) {
  return (
    <div className={clsx(
      'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5',
      'rounded-lg pl-4 pr-3 py-3 text-sm font-medium shadow-lg',
      toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
    )}>
      {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      <span>{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-1.5 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
