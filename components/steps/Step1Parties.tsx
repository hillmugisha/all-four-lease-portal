'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { LeaseFormData } from '@/lib/types'
import { US_STATES } from '@/lib/states'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  form: UseFormReturn<LeaseFormData>
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {open
          ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
          : <ChevronRight size={16} className="text-gray-400 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 py-4 grid grid-cols-1 gap-4 sm:grid-cols-2 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

const PHONE_REGEX = /^(\+1\s?)?(\(?\d{3}\)?[\s.\-]?)?\d{3}[\s.\-]?\d{4}$/

export default function Step1Parties({ form }: Props) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Parties</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the lessor and lessee details for this lease agreement.
        </p>
      </div>

      <div className="space-y-3">

        {/* ── Lessor ── */}
        <CollapsibleSection title="Lessor">
          {/* Company name — full width */}
          <div className="sm:col-span-2">
            <label className="label">Lessor Name / Company <span className="req">*</span></label>
            <input
              {...register('lessorName', { required: 'Required' })}
              placeholder="All Four, LLC"
              className="input"
            />
            {errors.lessorName && <p className="field-error">{errors.lessorName.message}</p>}
          </div>

          {/* Street + P.O. Box */}
          <div>
            <label className="label">Street Address <span className="req">*</span></label>
            <input
              {...register('lessorAddress', { required: 'Required' })}
              placeholder="1 TeamQuest Way"
              className="input"
            />
            {errors.lessorAddress && <p className="field-error">{errors.lessorAddress.message}</p>}
          </div>
          <div>
            <label className="label">P.O. Box</label>
            <input
              {...register('lessorPoBox')}
              placeholder="P.O. Box 147"
              className="input"
            />
          </div>

          {/* City */}
          <div>
            <label className="label">City <span className="req">*</span></label>
            <input
              {...register('lessorCity', { required: 'Required' })}
              placeholder="Clear Lake"
              className="input"
            />
            {errors.lessorCity && <p className="field-error">{errors.lessorCity.message}</p>}
          </div>

          {/* State + ZIP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">State <span className="req">*</span></label>
              <select
                {...register('lessorState', { required: 'Required' })}
                className="input"
              >
                <option value="">Select…</option>
                {US_STATES.map((s) => (
                  <option key={s.abbr} value={s.abbr}>{s.abbr} — {s.name}</option>
                ))}
              </select>
              {errors.lessorState && <p className="field-error">{errors.lessorState.message}</p>}
            </div>
            <div>
              <label className="label">ZIP <span className="req">*</span></label>
              <input
                {...register('lessorZip', { required: 'Required' })}
                placeholder="50428"
                className="input"
              />
              {errors.lessorZip && <p className="field-error">{errors.lessorZip.message}</p>}
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Lessee ── */}
        <CollapsibleSection title="Lessee">
          {/* Lessee name — full width */}
          <div className="sm:col-span-2">
            <label className="label">Lessee Name / Company <span className="req">*</span></label>
            <input
              {...register('lesseeName', { required: 'Required' })}
              placeholder="Emerald Companies, Inc."
              className="input"
            />
            {errors.lesseeName && <p className="field-error">{errors.lesseeName.message}</p>}
          </div>

          {/* Street address — full width */}
          <div className="sm:col-span-2">
            <label className="label">Street Address <span className="req">*</span></label>
            <input
              {...register('address', { required: 'Required' })}
              placeholder="6939 30th St. NE"
              className="input"
            />
            {errors.address && <p className="field-error">{errors.address.message}</p>}
          </div>

          {/* City */}
          <div>
            <label className="label">City <span className="req">*</span></label>
            <input
              {...register('city', { required: 'Required' })}
              placeholder="Sauk Rapids"
              className="input"
            />
            {errors.city && <p className="field-error">{errors.city.message}</p>}
          </div>

          {/* State + ZIP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">State <span className="req">*</span></label>
              <select
                {...register('state', { required: 'Required' })}
                className="input"
              >
                <option value="">Select…</option>
                {US_STATES.map((s) => (
                  <option key={s.abbr} value={s.abbr}>{s.abbr} — {s.name}</option>
                ))}
              </select>
              {errors.state && <p className="field-error">{errors.state.message}</p>}
            </div>
            <div>
              <label className="label">ZIP <span className="req">*</span></label>
              <input
                {...register('zip', { required: 'Required' })}
                placeholder="56379"
                className="input"
              />
              {errors.zip && <p className="field-error">{errors.zip.message}</p>}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="label">Phone</label>
            <input
              {...register('phone', {
                validate: (v) =>
                  !v || PHONE_REGEX.test(v) || 'Enter a valid US phone number',
              })}
              placeholder="320-241-5296"
              type="tel"
              className="input"
            />
            {errors.phone && <p className="field-error">{errors.phone.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label">Email <span className="req">*</span></label>
            <input
              {...register('email', {
                required: 'Required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
              placeholder="joel@example.com"
              type="email"
              className="input"
            />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
        </CollapsibleSection>

      </div>
    </div>
  )
}
