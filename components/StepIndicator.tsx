'use client'

import { Check } from 'lucide-react'
import clsx from 'clsx'

export interface StepDef {
  id:    number
  label: string
}

interface Props {
  steps:       StepDef[]
  currentStep: number
  onStepClick: (id: number) => void
}

export default function StepIndicator({ steps, currentStep, onStepClick }: Props) {
  return (
    <nav className="flex items-center justify-between px-2">
      {steps.map((s, i) => {
        const isActive    = currentStep === s.id
        const isCompleted = currentStep > s.id

        return (
          <div key={s.id} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onStepClick(s.id)}
              className="flex flex-col items-center gap-1.5 focus:outline-none group"
            >
              <div className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                isActive || isCompleted
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 bg-white text-gray-400 group-hover:border-gray-400',
              )}>
                {isCompleted ? <Check size={13} strokeWidth={2.5} /> : s.id}
              </div>
              <span className={clsx(
                'text-xs font-medium whitespace-nowrap transition-colors',
                isActive || isCompleted
                  ? 'text-brand-600'
                  : 'text-gray-400 group-hover:text-gray-500',
              )}>
                {s.label}
              </span>
            </button>

            {i < steps.length - 1 && (
              <div className={clsx(
                'mx-6 mb-5 h-px flex-1 transition-colors',
                isCompleted ? 'bg-brand-600' : 'bg-gray-200',
              )} />
            )}
          </div>
        )
      })}
    </nav>
  )
}
