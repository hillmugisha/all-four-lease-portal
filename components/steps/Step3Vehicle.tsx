'use client'

import { UseFormReturn } from 'react-hook-form'
import { LeaseFormData } from '@/lib/types'

interface Props {
  form: UseFormReturn<LeaseFormData>
}

export default function Step3Vehicle({ form }: Props) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Vehicle Details</h2>
        <p className="mt-1 text-sm text-gray-500">Enter the vehicle being leased.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">

        {/* Condition */}
        <div className="sm:col-span-2">
          <label className="label">Condition <span className="req">*</span></label>
          <select {...register('condition', { required: 'Required' })} className="input">
            <option value="NEW">NEW</option>
            <option value="USED">USED</option>
          </select>
          {errors.condition && <p className="field-error">{errors.condition.message}</p>}
        </div>

        {/* Year */}
        <div className="sm:col-span-1">
          <label className="label">Year <span className="req">*</span></label>
          <input
            {...register('year', { required: 'Required' })}
            placeholder="2025"
            maxLength={4}
            className="input"
          />
          {errors.year && <p className="field-error">{errors.year.message}</p>}
        </div>

        {/* Make */}
        <div className="sm:col-span-1">
          <label className="label">Make <span className="req">*</span></label>
          <input
            {...register('make', { required: 'Required' })}
            placeholder="RAM"
            className="input"
          />
          {errors.make && <p className="field-error">{errors.make.message}</p>}
        </div>

        {/* Model */}
        <div className="sm:col-span-2">
          <label className="label">Model <span className="req">*</span></label>
          <input
            {...register('model', { required: 'Required' })}
            placeholder="3500 LARAMIE"
            className="input"
          />
          {errors.model && <p className="field-error">{errors.model.message}</p>}
        </div>

        {/* Body Style — optional, free text */}
        <div className="sm:col-span-2">
          <label className="label">Body Style</label>
          <input
            {...register('bodyStyle')}
            placeholder="e.g. TRUCK, SUV, SEDAN…"
            className="input"
          />
        </div>

        {/* Odometer */}
        <div className="sm:col-span-2">
          <label className="label">Odometer (miles)</label>
          <input
            {...register('odometer')}
            placeholder="40"
            type="number"
            min={0}
            className="input"
          />
        </div>

        {/* VIN — full width */}
        <div className="sm:col-span-6">
          <label className="label">VIN <span className="req">*</span></label>
          <input
            {...register('vin', {
              required: 'Required',
              minLength: { value: 17, message: 'VIN must be 17 characters' },
              maxLength: { value: 17, message: 'VIN must be 17 characters' },
            })}
            placeholder="3C63R3EL6SG573322"
            maxLength={17}
            className="input font-mono uppercase tracking-widest"
          />
          {errors.vin && <p className="field-error">{errors.vin.message}</p>}
        </div>
      </div>
    </div>
  )
}
