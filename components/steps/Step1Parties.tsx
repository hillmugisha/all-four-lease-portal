'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { LeaseFormData } from '@/lib/types'
import { US_STATES } from '@/lib/states'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  form: UseFormReturn<LeaseFormData>
}

// ─── Lessor presets ───────────────────────────────────────────────────────────

const LESSORS = [
  {
    name:    'All Four, LLC',
    address: '1 TeamQuest Way',
    poBox:   'P.O. Box 147',
    city:    'Clear Lake',
    state:   'IA',
    zip:     '50428',
  },
  {
    name:    'North Iowa Equity, LLC',
    address: '1 TeamQuest Way',
    poBox:   'P.O. Box 147',
    city:    'Clear Lake',
    state:   'IA',
    zip:     '50428',
  },
]

// ─── Lease classification mappings (from Lease_Type_Data_Mappings.xlsx) ───────

const LEASE_MAPPINGS: { leaseType: string; customerType: string; vehicleUse: string }[] = [
  { leaseType: 'Closed-End Lease',      customerType: 'Individual', vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Closed-End Lease',      customerType: 'Business',   vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Closed-End Lease',      customerType: 'Employee',   vehicleUse: 'Company Demo' },
  { leaseType: 'Closed-End Lease',      customerType: 'Employee',   vehicleUse: 'Company Vehicle' },
  { leaseType: 'Closed-End Lease',      customerType: 'Internal',   vehicleUse: 'Company Vehicle' },
  { leaseType: 'Closed-End Lease',      customerType: 'Individual', vehicleUse: 'Service / Loaner (Service Exchange)' },
  { leaseType: 'Closed-End Lease',      customerType: 'Business',   vehicleUse: 'Service / Loaner (Service Exchange)' },
  { leaseType: 'TRAC / Open-End Lease', customerType: 'Business',   vehicleUse: 'Standard Customer Use' },
  { leaseType: 'TRAC / Open-End Lease', customerType: 'Government', vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Lease Purchase',        customerType: 'Business',   vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Lease Purchase',        customerType: 'Individual', vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Finance (Loan)',         customerType: 'Business',   vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Finance (Loan)',         customerType: 'Individual', vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Rental / Short-Term',   customerType: 'Business',   vehicleUse: 'Rental' },
  { leaseType: 'Rental / Short-Term',   customerType: 'Individual', vehicleUse: 'Rental' },
]

const DEPARTMENTS = [
  'Chrysler of Forest City',
  "Pritchard's Lake Chevrolet",
  'Mason City Motor Co. - GMC',
  'Other',
]

const ALL_LEASE_TYPES = Array.from(new Set(LEASE_MAPPINGS.map((m) => m.leaseType)))

function getCustomerTypes(leaseType: string): string[] {
  return Array.from(new Set(
    LEASE_MAPPINGS.filter((m) => m.leaseType === leaseType).map((m) => m.customerType)
  ))
}

function getVehicleUses(leaseType: string, customerType: string): string[] {
  return Array.from(new Set(
    LEASE_MAPPINGS
      .filter((m) => m.leaseType === leaseType && m.customerType === customerType)
      .map((m) => m.vehicleUse)
  ))
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  innerClassName = 'grid grid-cols-1 gap-4 sm:grid-cols-6',
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  innerClassName?: string
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
        <div className={`px-4 py-4 bg-white ${innerClassName}`}>
          {children}
        </div>
      )}
    </div>
  )
}

const PHONE_REGEX = /^(\+1\s?)?(\(?\d{3}\)?[\s.\-]?)?\d{3}[\s.\-]?\d{4}$/

export default function Step1Parties({ form }: Props) {
  const { register, setValue, watch, formState: { errors } } = form

  const lessorName   = watch('lessorName')
  const leaseType    = watch('leaseType')    ?? 'Closed-End Lease'
  const customerType = watch('customerType') ?? 'Business'
  const vehicleUse   = watch('vehicleUse')   ?? 'Standard Customer Use'
  const department   = watch('department')   ?? ''

  function handleLessorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = LESSORS.find((l) => l.name === e.target.value)
    if (!selected) return
    setValue('lessorName',    selected.name)
    setValue('lessorAddress', selected.address)
    setValue('lessorPoBox',   selected.poBox)
    setValue('lessorCity',    selected.city)
    setValue('lessorState',   selected.state)
    setValue('lessorZip',     selected.zip)
  }

  function handleLeaseTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const lt = e.target.value
    setValue('leaseType', lt)
    const availableCustomerTypes = getCustomerTypes(lt)
    const newCt = availableCustomerTypes[0] ?? ''
    setValue('customerType', newCt)
    const availableVehicleUses = getVehicleUses(lt, newCt)
    setValue('vehicleUse', availableVehicleUses[0] ?? '')
    setValue('department', '')
    setValue('departmentOther', '')
  }

  function handleCustomerTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const ct = e.target.value
    setValue('customerType', ct)
    if (ct === 'Internal') {
      setValue('vehicleUse', 'Company Vehicle')
    } else {
      const availableVehicleUses = getVehicleUses(leaseType, ct)
      setValue('vehicleUse', availableVehicleUses[0] ?? '')
    }
    setValue('department', '')
    setValue('departmentOther', '')
  }

  const [leaseSetupOpen, setLeaseSetupOpen] = useState(false)

  const availableCustomerTypes = getCustomerTypes(leaseType)
  const availableVehicleUses   = getVehicleUses(leaseType, customerType)
  const isInternal             = customerType === 'Internal'
  const showDeptOther          = department === 'Other'
  const departmentOther        = watch('departmentOther') ?? ''
  const deptLabel              = department === 'Other' ? departmentOther : department
  const classificationComplete = !!(leaseType && customerType && vehicleUse)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Parties</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the lessor and lessee details for this lease agreement.
        </p>
      </div>

      <div className="space-y-3">

        {/* ── Lease Setup ── */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setLeaseSetupOpen((o) => !o)}
            className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-gray-800">Lease Setup</span>
              <p className="mt-0.5 text-xs text-gray-500">
                Define how this lease is structured and used
              </p>
              {!leaseSetupOpen && classificationComplete && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {leaseType}
                  </span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {customerType}
                  </span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {vehicleUse}
                  </span>
                  {isInternal && deptLabel && (
                    <>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {deptLabel}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            {leaseSetupOpen
              ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
              : <ChevronRight size={16} className="text-gray-400 shrink-0" />
            }
          </button>

          {leaseSetupOpen && (
            <div className="px-4 py-4 bg-white">

              {/* Three dropdowns inline */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                {/* Lease Type */}
                <div>
                  <label className="label">
                    Lease Type <span className="req">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register('leaseType', { required: 'Select a lease type' })}
                      value={leaseType}
                      onChange={handleLeaseTypeChange}
                      className="input appearance-none pr-8"
                    >
                      {ALL_LEASE_TYPES.map((lt) => (
                        <option key={lt} value={lt}>{lt}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Structure of the lease agreement</p>
                  {errors.leaseType && <p className="field-error">{errors.leaseType.message}</p>}
                </div>

                {/* Customer Type */}
                <div>
                  <label className="label">
                    Customer Type <span className="req">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register('customerType', { required: 'Select a customer type' })}
                      value={customerType}
                      onChange={handleCustomerTypeChange}
                      className="input appearance-none pr-8"
                    >
                      {availableCustomerTypes.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Who is leasing this vehicle</p>
                  {errors.customerType && <p className="field-error">{errors.customerType.message}</p>}
                </div>

                {/* Vehicle Use */}
                <div>
                  <label className="label">
                    Vehicle Use <span className="req">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register('vehicleUse', { required: 'Select a vehicle use' })}
                      value={vehicleUse}
                      disabled={isInternal}
                      className="input appearance-none pr-8 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default"
                    >
                      {availableVehicleUses.map((vu) => (
                        <option key={vu} value={vu}>{vu}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {isInternal ? 'Fixed for internal assignments' : 'Intended purpose of the vehicle'}
                  </p>
                  {errors.vehicleUse && <p className="field-error">{errors.vehicleUse.message}</p>}
                </div>

              </div>

              {/* Department / Location — only when Internal */}
              {isInternal && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">
                      Department / Location <span className="req">*</span>
                    </label>
                    <div className="relative">
                      <select
                        {...register('department', { required: isInternal ? 'Select a department / location' : false })}
                        value={department}
                        className="input appearance-none pr-8"
                      >
                        <option value="">Select department / location…</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Pritchard location receiving the vehicle</p>
                    {errors.department && <p className="field-error">{errors.department.message}</p>}
                  </div>

                  {showDeptOther && (
                    <div>
                      <label className="label">
                        Location Name <span className="req">*</span>
                      </label>
                      <input
                        {...register('departmentOther', {
                          required: showDeptOther ? 'Enter the location name' : false,
                        })}
                        placeholder="e.g. Midwest Fleet Services"
                        className="input"
                      />
                      {errors.departmentOther && (
                        <p className="field-error">{errors.departmentOther.message}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Compact summary pills */}
              {classificationComplete && (
                <div className="mt-5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {leaseType}
                  </span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {customerType}
                  </span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {vehicleUse}
                  </span>
                  {isInternal && deptLabel && (
                    <>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {deptLabel}
                      </span>
                    </>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── Lessor Details ── */}
        <CollapsibleSection title="Lessor Details">
          {/* Company name — full width */}
          <div className="sm:col-span-6">
            <label className="label">Lessor Name / Company <span className="req">*</span></label>
            <div className="relative">
              <select
                {...register('lessorName', { required: 'Required' })}
                onChange={handleLessorChange}
                value={lessorName ?? ''}
                className="input appearance-none pr-8"
              >
                <option value="" disabled>Select lessor…</option>
                {LESSORS.map((l) => (
                  <option key={l.name} value={l.name}>{l.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {errors.lessorName && <p className="field-error">{errors.lessorName.message}</p>}
          </div>

          {/* Street (wider) + P.O. Box (narrower) — same row */}
          <div className="sm:col-span-4">
            <label className="label">Street Address <span className="req">*</span></label>
            <input
              {...register('lessorAddress', { required: 'Required' })}
              readOnly
              className="input bg-gray-50 text-gray-500 cursor-default"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">P.O. Box</label>
            <input
              {...register('lessorPoBox')}
              readOnly
              className="input bg-gray-50 text-gray-500 cursor-default"
            />
          </div>

          {/* City + State + ZIP — same row */}
          <div className="sm:col-span-3">
            <label className="label">City <span className="req">*</span></label>
            <input
              {...register('lessorCity', { required: 'Required' })}
              readOnly
              className="input bg-gray-50 text-gray-500 cursor-default"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">State <span className="req">*</span></label>
            <input
              {...register('lessorState', { required: 'Required' })}
              readOnly
              className="input bg-gray-50 text-gray-500 cursor-default"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="label">ZIP <span className="req">*</span></label>
            <input
              {...register('lessorZip', { required: 'Required' })}
              readOnly
              className="input bg-gray-50 text-gray-500 cursor-default"
            />
          </div>
        </CollapsibleSection>

        {/* ── Lessee Details ── */}
        <CollapsibleSection title="Lessee Details">

          {/* Lessee name — full width */}
          <div className="sm:col-span-6">
            <label className="label">Lessee Name / Company <span className="req">*</span></label>
            <input
              {...register('lesseeName', { required: 'Required' })}
              placeholder="Emerald Companies, Inc."
              className="input"
            />
            {errors.lesseeName && <p className="field-error">{errors.lesseeName.message}</p>}
          </div>

          {/* Street address — full width */}
          <div className="sm:col-span-6">
            <label className="label">Street Address <span className="req">*</span></label>
            <input
              {...register('address', { required: 'Required' })}
              placeholder="6939 30th St. NE"
              className="input"
            />
            {errors.address && <p className="field-error">{errors.address.message}</p>}
          </div>

          {/* City + State + ZIP — same row */}
          <div className="sm:col-span-3">
            <label className="label">City <span className="req">*</span></label>
            <input
              {...register('city', { required: 'Required' })}
              placeholder="Sauk Rapids"
              className="input"
            />
            {errors.city && <p className="field-error">{errors.city.message}</p>}
          </div>
          <div className="sm:col-span-2">
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
          <div className="sm:col-span-1">
            <label className="label">ZIP <span className="req">*</span></label>
            <input
              {...register('zip', { required: 'Required' })}
              placeholder="56379"
              className="input"
            />
            {errors.zip && <p className="field-error">{errors.zip.message}</p>}
          </div>

          {/* Phone (narrow) + Email (wider) — same row */}
          <div className="sm:col-span-2">
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
          <div className="sm:col-span-4">
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

