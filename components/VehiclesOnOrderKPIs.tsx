'use client'

import { useMemo } from 'react'
import { VehicleOnOrderRecord } from '@/lib/vehicles-on-order-types'
import { HelpCircle, Clock, Calendar, Cpu, Truck, CheckCircle2, MoreHorizontal } from 'lucide-react'

interface CardDef {
  label:      string
  count:      number
  Icon:       React.ElementType
  iconClass:  string
  iconBg:     string
  accent:     string
  filterStatuses: string[]
}

export default function VehiclesOnOrderKPIs({
  vehicles,
  onFilterByStatus,
}: {
  vehicles:          VehicleOnOrderRecord[]
  onFilterByStatus?: (statuses: string[]) => void
}) {
  const cards = useMemo<CardDef[]>(() => {
    let tbd = 0, inOrderProcessing = 0, scheduled = 0, inProduction = 0, inTransit = 0, oemDelivered = 0, allOthers = 0
    const otherStatusSet = new Set<string>()

    for (const v of vehicles) {
      const s = v.shaed_status
      if (s === 'TBD')                     tbd++
      else if (s === 'In Order Processing') inOrderProcessing++
      else if (s === 'Scheduled')          scheduled++
      else if (s === 'In Production')      inProduction++
      else if (s === 'In Transit')         inTransit++
      else if (s === 'OEM Delivered')      oemDelivered++
      else {
        allOthers++
        // coerce null → '' to match how applyFilters handles it
        otherStatusSet.add(s ?? '')
      }
    }

    return [
      { label: 'TBD',                count: tbd,               Icon: HelpCircle,     iconClass: 'text-amber-600',  iconBg: 'bg-amber-100',  accent: 'from-amber-50',  filterStatuses: ['TBD']                },
      { label: 'In Order Processing', count: inOrderProcessing, Icon: Clock,          iconClass: 'text-purple-600', iconBg: 'bg-purple-100', accent: 'from-purple-50', filterStatuses: ['In Order Processing'] },
      { label: 'Scheduled',          count: scheduled,         Icon: Calendar,       iconClass: 'text-indigo-600', iconBg: 'bg-indigo-100', accent: 'from-indigo-50', filterStatuses: ['Scheduled']           },
      { label: 'In Production',      count: inProduction,      Icon: Cpu,            iconClass: 'text-teal-600',   iconBg: 'bg-teal-100',   accent: 'from-teal-50',   filterStatuses: ['In Production']       },
      { label: 'In Transit',         count: inTransit,         Icon: Truck,          iconClass: 'text-orange-600', iconBg: 'bg-orange-100', accent: 'from-orange-50', filterStatuses: ['In Transit']          },
      { label: 'OEM Delivered',      count: oemDelivered,      Icon: CheckCircle2,   iconClass: 'text-green-600',  iconBg: 'bg-green-100',  accent: 'from-green-50',  filterStatuses: ['OEM Delivered']       },
      { label: 'All Others',         count: allOthers,         Icon: MoreHorizontal, iconClass: 'text-gray-500',   iconBg: 'bg-gray-100',   accent: 'from-gray-50',   filterStatuses: Array.from(otherStatusSet) },
    ]
  }, [vehicles])

  return (
    <div>
      <p className="text-sm font-bold text-gray-900 mb-3">OEM Production Statuses</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {cards.map(({ label, count, Icon, iconClass, iconBg, accent, filterStatuses }) => (
          <div
            key={label}
            className={`
              group relative overflow-hidden rounded-xl border border-green-100
              bg-gradient-to-br ${accent} via-white to-green-50
              px-4 py-4 shadow-sm
              select-none
              transition-all duration-200
              hover:scale-[1.03] hover:shadow-lg hover:border-green-300 hover:to-green-100
            `}
          >
            {/* Decorative blob */}
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-green-100 opacity-40 transition-all duration-200 group-hover:opacity-70 group-hover:scale-125" />

            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
              <Icon size={18} className={iconClass} />
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-900 leading-tight">{label}</p>

            {/* Count + View all on same row */}
            <div className="flex items-end justify-between mt-0.5">
              <p className="text-2xl font-bold text-gray-900 leading-tight">{count.toLocaleString()}</p>
              {onFilterByStatus && count > 0 && (
                <button
                  onClick={() => onFilterByStatus(filterStatuses)}
                  className="text-[11px] font-medium text-brand-600 hover:underline leading-tight pb-0.5"
                >
                  View all →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
