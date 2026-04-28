'use client'

import { useFieldArray, UseFormReturn } from 'react-hook-form'
import type { LeaseScheduleFormData } from '@/lib/lease-schedule-types'

const inputCls =
  'w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-right text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200'

function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-gray-400 text-xs">$</span>
      <input
        {...props}
        type="number"
        step="0.01"
        min="0"
        className="w-full rounded border border-gray-300 bg-white pl-5 pr-1 py-1 text-xs text-right text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
      />
    </div>
  )
}

interface Props {
  form: UseFormReturn<LeaseScheduleFormData>
}

export default function LeaseScheduleStep2Vehicles({ form }: Props) {
  const { register, control } = form
  const { fields } = useFieldArray({ control, name: 'vehicles' })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Vehicles &amp; Financial Terms</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review the selected vehicles and enter lease financial terms for each unit.
        </p>
      </div>

      {fields.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No vehicles were passed to this schedule. Go back to the Vehicles on Order table and select at least one vehicle.
        </div>
      )}

      {fields.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Unit / VIN</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Vehicle Description</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Color</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Lease Start</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">Term (mo)</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">Net Cap Cost</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">Monthly Pmt</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">Residual Value</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => (
                <tr
                  key={field.id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-3 py-2 text-gray-500 text-xs align-middle">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700 align-middle whitespace-nowrap">
                    {field.vin ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 text-xs align-middle whitespace-nowrap">
                    {[field.model_year, field.oem, field.vehicle_line].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs align-middle">
                    {field.color ?? '—'}
                  </td>
                  {/* ── Editable financial fields ── */}
                  <td className="px-2 py-1.5 align-middle min-w-[120px]">
                    <input
                      {...register(`vehicles.${i}.lease_start_date`)}
                      type="date"
                      className={inputCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle min-w-[70px]">
                    <input
                      {...register(`vehicles.${i}.term`, { valueAsNumber: true })}
                      type="number"
                      min={1}
                      max={84}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle min-w-[110px]">
                    <MoneyInput {...register(`vehicles.${i}.net_cap_cost`, { valueAsNumber: true })} />
                  </td>
                  <td className="px-2 py-1.5 align-middle min-w-[110px]">
                    <MoneyInput {...register(`vehicles.${i}.monthly_payment`, { valueAsNumber: true })} />
                  </td>
                  <td className="px-2 py-1.5 align-middle min-w-[110px]">
                    <MoneyInput {...register(`vehicles.${i}.residual_value`, { valueAsNumber: true })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Schedule reference fields ── */}
      <div className="pt-2 max-w-xs">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Schedule Date
        </label>
        <input
          {...register('scheduleDate')}
          type="date"
          className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
        />
      </div>
    </div>
  )
}
