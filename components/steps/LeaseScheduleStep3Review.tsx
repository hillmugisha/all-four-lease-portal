'use client'

import { UseFormReturn } from 'react-hook-form'
import type { LeaseScheduleFormData } from '@/lib/lease-schedule-types'

function fmt(n: number | null | undefined): string {
  if (!n) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return `${m}/${d}/${y}`
}

interface Props {
  form: UseFormReturn<LeaseScheduleFormData>
}

export default function LeaseScheduleStep3Review({ form }: Props) {
  const data = form.watch()

  const lesseeName = data.lesseeType === 'individual'
    ? `${data.lesseeFirstName ?? ''} ${data.lesseeLastName ?? ''}`.trim()
    : data.lesseeName ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review</h2>
        <p className="mt-1 text-sm text-gray-500">
          Confirm the lease schedule details below before proceeding to signatures.
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Lessor</p>
          <p className="text-sm font-semibold text-gray-900">{data.lessorName || '—'}</p>
          <p className="text-xs text-gray-500">{data.lessorAddress}{data.lessorPoBox ? `, ${data.lessorPoBox}` : ''}</p>
          <p className="text-xs text-gray-500">{[data.lessorCity, data.lessorState, data.lessorZip].filter(Boolean).join(', ')}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Lessee</p>
          <p className="text-sm font-semibold text-gray-900">{lesseeName || '—'}</p>
          <p className="text-xs text-gray-500">{data.address}</p>
          <p className="text-xs text-gray-500">{[data.city, data.state, data.zip].filter(Boolean).join(', ')}</p>
          <p className="text-xs text-gray-500">{data.email}</p>
        </div>
      </div>

      {/* ── Reference ── */}
      {data.scheduleDate && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Schedule Reference</p>
          <p className="text-sm text-gray-700">
            <span className="text-gray-500">Date: </span>{fmtDate(data.scheduleDate)}
          </p>
        </div>
      )}

      {/* ── Vehicle summary ── */}
      {data.vehicles && data.vehicles.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <p className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
            Vehicles ({data.vehicles.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">VIN</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Description</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Lease Start</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Term</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Net Cap Cost</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Monthly Pmt</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Residual</th>
                </tr>
              </thead>
              <tbody>
                {data.vehicles.map((v, i) => (
                  <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-gray-700">{v.vin ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {[v.model_year, v.oem, v.vehicle_line].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{fmtDate(v.lease_start_date)}</td>
                    <td className="px-3 py-2 text-gray-700">{v.term ? `${v.term} mo` : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{fmt(v.net_cap_cost)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{fmt(v.monthly_payment)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{fmt(v.residual_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
