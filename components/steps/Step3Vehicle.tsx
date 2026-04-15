'use client'

import { useState, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { LeaseFormData } from '@/lib/types'
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'

interface Props {
  form: UseFormReturn<LeaseFormData>
}

type LookupState = 'idle' | 'loading' | 'found' | 'not_found'

export default function Step3Vehicle({ form }: Props) {
  const { register, setValue, watch, formState: { errors } } = form
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const vin = watch('vin') ?? ''

  function clearVehicleFields() {
    setValue('condition', 'NEW')
    setValue('year', '')
    setValue('make', '')
    setValue('model', '')
    setValue('bodyStyle', '')
    setValue('odometer', '')
  }

  async function lookupVin(raw: string) {
    const value = raw.trim().toUpperCase()
    if (value.length !== 17) {
      setLookupState('idle')
      return
    }

    setLookupState('loading')
    try {
      const res  = await fetch(`/api/vehicles/lookup?vin=${encodeURIComponent(value)}`)
      const data = await res.json()

      if (data.found) {
        setValue('condition', data.condition || 'NEW')
        setValue('year',      data.year)
        setValue('make',      data.make)
        setValue('model',     data.model)
        setValue('bodyStyle', data.bodyStyle)
        setValue('odometer',  data.odometer)
        setLookupState('found')
      } else {
        clearVehicleFields()
        setLookupState('not_found')
      }
    } catch {
      setLookupState('not_found')
    }
  }

  function handleVinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toUpperCase()
    setValue('vin', value)

    // Reset status while typing
    setLookupState('idle')
    clearVehicleFields()

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => lookupVin(value), 500)
  }

  function handleClearVin() {
    setValue('vin', '')
    clearVehicleFields()
    setLookupState('idle')
  }

  const coreDisabled = lookupState === 'found'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Vehicle Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the VIN to auto-populate vehicle details, or fill them in manually.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">

        {/* VIN — first, full width */}
        <div className="sm:col-span-6">
          <label className="label">VIN <span className="req">*</span></label>
          <div className="relative">
            <input
              {...register('vin', {
                required: 'Required',
                minLength: { value: 17, message: 'VIN must be 17 characters' },
                maxLength: { value: 17, message: 'VIN must be 17 characters' },
              })}
              onChange={handleVinChange}
              placeholder="Enter 17-character VIN…"
              maxLength={17}
              className="input font-mono uppercase tracking-widest pr-10"
              autoFocus
            />
            {/* Status icon / clear */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {lookupState === 'loading' && (
                <Loader2 size={16} className="animate-spin text-gray-400" />
              )}
              {lookupState === 'found' && (
                <button type="button" onClick={handleClearVin} title="Clear VIN" className="text-green-600 hover:text-green-700">
                  <X size={16} />
                </button>
              )}
              {lookupState === 'not_found' && (
                <button type="button" onClick={handleClearVin} title="Clear VIN" className="text-red-500 hover:text-red-600">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          {errors.vin && <p className="field-error">{errors.vin.message}</p>}

          {/* Lookup status banners */}
          {lookupState === 'found' && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              <CheckCircle2 size={15} className="shrink-0" />
              Vehicle found — details auto-populated. Click × to enter a different VIN.
            </div>
          )}
          {lookupState === 'not_found' && (
            <div className="mt-2 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertCircle size={15} className="shrink-0" />
              VIN not found in database — please enter the vehicle details manually below.
            </div>
          )}
        </div>

        {/* Remaining fields — always visible, disabled when auto-filled */}

        {/* Row 2: Condition | Year | Make | Model — proportioned to data length */}
        <div className="sm:col-span-1">
          <label className="label">Condition <span className="req">*</span></label>
          <select
            {...register('condition', { required: 'Required' })}
            disabled={coreDisabled}
            className="input disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="NEW">NEW</option>
            <option value="USED">USED</option>
          </select>
          {errors.condition && <p className="field-error">{errors.condition.message}</p>}
        </div>

        <div className="sm:col-span-1">
          <label className="label">Year <span className="req">*</span></label>
          <input
            {...register('year', { required: 'Required' })}
            placeholder="2025"
            maxLength={4}
            disabled={coreDisabled}
            className="input disabled:bg-gray-50 disabled:text-gray-500"
          />
          {errors.year && <p className="field-error">{errors.year.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label">Make <span className="req">*</span></label>
          <input
            {...register('make', { required: 'Required' })}
            placeholder="RAM"
            disabled={coreDisabled}
            className="input disabled:bg-gray-50 disabled:text-gray-500"
          />
          {errors.make && <p className="field-error">{errors.make.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label">Model <span className="req">*</span></label>
          <input
            {...register('model', { required: 'Required' })}
            placeholder="3500 LARAMIE"
            disabled={coreDisabled}
            className="input disabled:bg-gray-50 disabled:text-gray-500"
          />
          {errors.model && <p className="field-error">{errors.model.message}</p>}
        </div>

        {/* Row 3: Body Style | Odometer */}
        <div className="sm:col-span-3">
          <label className="label">Body Style</label>
          <input
            {...register('bodyStyle')}
            placeholder="e.g. TRUCK, SUV, SEDAN…"
            className="input"
          />
        </div>

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

      </div>
    </div>
  )
}
