'use client'

import { useState, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { LeaseFormData, VehicleOnOrderSummary } from '@/lib/types'
import { Loader2, CheckCircle2, AlertCircle, X, Info } from 'lucide-react'

interface Props {
  form: UseFormReturn<LeaseFormData>
  prefilled?: boolean
  isMasterLease?: boolean
}

type LookupState = 'idle' | 'loading' | 'found' | 'not_found'

export default function Step3Vehicle({ form, prefilled, isMasterLease }: Props) {
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

  // ── Master lease mode: editable vehicle table ─────────────────────────────
  if (isMasterLease) {
    // Live source: read from vehicles_json form field so edits persist across steps
    const rawJson = watch('vehicles_json') ?? '[]'
    let vehicles: VehicleOnOrderSummary[] = []
    try { vehicles = JSON.parse(rawJson) } catch { /* keep empty */ }

    const updateVehicleField = (
      id: number,
      field: 'body_style' | 'odometer',
      value: string,
    ) => {
      const updated = vehicles.map((v) =>
        v.id === id ? { ...v, [field]: value || null } : v
      )
      setValue('vehicles_json', JSON.stringify(updated))
    }

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Vehicles Covered by this Master Lease</h2>
          <p className="mt-1 text-sm text-gray-500">
            These vehicles were imported from Vehicles on Order and are included in the Master Lease Agreement.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <Info size={15} className="shrink-0" />
          Year, Make, Model, VIN and Color are locked (from Vehicles on Order).
          Fill in Body Style and Odometer for each vehicle below.
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500 w-8">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Year</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Make</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Model</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500">VIN</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Color</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                  Body Style <span className="text-brand-600 font-normal normal-case">(editable)</span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                  Odometer <span className="text-brand-600 font-normal normal-case">(editable)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, i) => (
                <tr key={v.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-400 text-center">{i + 1}</td>
                  {/* Locked fields */}
                  <td className="px-3 py-2 text-gray-500 bg-gray-50">{v.model_year ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500 bg-gray-50">{v.oem ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500 bg-gray-50 max-w-[180px] truncate" title={v.vehicle_line ?? ''}>{v.vehicle_line ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500 bg-gray-50 font-mono text-xs">{v.vin ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500 bg-gray-50 max-w-[140px] truncate" title={v.color ?? ''}>{v.color ?? '—'}</td>
                  {/* Editable: Body Style */}
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={v.body_style ?? ''}
                      onChange={(e) => updateVehicleField(v.id, 'body_style', e.target.value)}
                      placeholder="e.g. TRUCK, SUV…"
                      className="input py-1 text-sm w-full min-w-[120px]"
                    />
                  </td>
                  {/* Editable: Odometer */}
                  <td className="px-2 py-1.5">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={v.odometer ?? ''}
                        onChange={(e) => updateVehicleField(v.id, 'odometer', e.target.value)}
                        placeholder="0"
                        className="input py-1 text-sm w-full min-w-[90px] pr-7"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">mi</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Vehicle Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          {prefilled
            ? 'Vehicle pre-filled from Vehicles on Order. VIN, Year, Make and Model are locked.'
            : 'Enter the VIN to auto-populate vehicle details, or fill them in manually.'}
        </p>
      </div>

      {prefilled && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <Info size={15} className="shrink-0" />
          VIN, Year, Make and Model are pre-filled from the selected vehicle on order and cannot be edited.
        </div>
      )}

      <div className="space-y-4">

        {/* Row 1: VIN | Condition | Year | Make | Model — 5 columns */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div>
            <label className="label">VIN <span className="req">*</span></label>
            <div className="relative">
              <input
                {...register('vin', {
                  required: 'Required',
                  minLength: { value: 17, message: 'VIN must be 17 characters' },
                  maxLength: { value: 17, message: 'VIN must be 17 characters' },
                })}
                onChange={prefilled ? undefined : handleVinChange}
                readOnly={prefilled}
                placeholder="Enter 17-character VIN…"
                maxLength={17}
                className="input font-mono uppercase tracking-widest pr-10 read-only:bg-gray-50 read-only:text-gray-500 read-only:cursor-default"
                autoFocus={!prefilled}
              />
              {!prefilled && (
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
              )}
            </div>
            {errors.vin && <p className="field-error">{errors.vin.message}</p>}
            {!prefilled && lookupState === 'found' && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1.5">
                <CheckCircle2 size={13} className="shrink-0" />
                Found — click × to clear.
              </div>
            )}
            {!prefilled && lookupState === 'not_found' && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                <AlertCircle size={13} className="shrink-0" />
                Not found — enter manually.
              </div>
            )}
          </div>

          <div>
            <label className="label">Condition <span className="req">*</span></label>
            <select
              {...register('condition', { required: 'Required' })}
              className="input"
            >
              <option value="NEW">NEW</option>
              <option value="USED">USED</option>
            </select>
            {errors.condition && <p className="field-error">{errors.condition.message}</p>}
          </div>

          <div>
            <label className="label">Year <span className="req">*</span></label>
            <input
              {...register('year', { required: 'Required' })}
              placeholder="2025"
              maxLength={4}
              readOnly={prefilled}
              disabled={!prefilled && lookupState === 'found'}
              className="input disabled:bg-gray-50 disabled:text-gray-500 read-only:bg-gray-50 read-only:text-gray-500 read-only:cursor-default"
            />
            {errors.year && <p className="field-error">{errors.year.message}</p>}
          </div>

          <div>
            <label className="label">Make <span className="req">*</span></label>
            <input
              {...register('make', { required: 'Required' })}
              placeholder="RAM"
              readOnly={prefilled}
              disabled={!prefilled && lookupState === 'found'}
              className="input disabled:bg-gray-50 disabled:text-gray-500 read-only:bg-gray-50 read-only:text-gray-500 read-only:cursor-default"
            />
            {errors.make && <p className="field-error">{errors.make.message}</p>}
          </div>

          <div>
            <label className="label">Model <span className="req">*</span></label>
            <input
              {...register('model', { required: 'Required' })}
              placeholder="3500 LARAMIE"
              readOnly={prefilled}
              disabled={!prefilled && lookupState === 'found'}
              className="input disabled:bg-gray-50 disabled:text-gray-500 read-only:bg-gray-50 read-only:text-gray-500 read-only:cursor-default"
            />
            {errors.model && <p className="field-error">{errors.model.message}</p>}
          </div>
        </div>

        {/* Row 2: Body Style | Odometer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Body Style</label>
            <input
              {...register('bodyStyle')}
              placeholder="e.g. TRUCK, SUV, SEDAN…"
              className="input"
            />
          </div>
          <div>
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
    </div>
  )
}
