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

// ─── Lease classification mappings (from Lease_Type_Data_Mappings Updated.xlsx) ─

const LEASE_MAPPINGS: { leaseType: string; contractStructure: string; customerType: string; vehicleUse: string }[] = [
  { leaseType: 'Core',            contractStructure: 'Closed-End Lease',      customerType: 'Individual',       vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Core',            contractStructure: 'Closed-End Lease',      customerType: 'Business',         vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Core',            contractStructure: 'Closed-End Lease',      customerType: 'Internal',         vehicleUse: 'Company Demo' },
  { leaseType: 'Core',            contractStructure: 'Closed-End Lease',      customerType: 'Internal',         vehicleUse: 'Company Vehicle' },
  { leaseType: 'Core',            contractStructure: 'Closed-End Lease',      customerType: 'Internal',         vehicleUse: 'Service / Loaner (Service Exchange)' },
  { leaseType: 'Core',            contractStructure: 'TRAC / Open-End Lease', customerType: 'Business',         vehicleUse: 'Standard Customer Use' },
  { leaseType: 'Daily Rental',    contractStructure: 'TRAC / Open-End Lease', customerType: 'Daily Rental',     vehicleUse: 'Standard Customer Use' },
  { leaseType: 'All Four Rental', contractStructure: 'Rental / Short-Term',   customerType: 'All Four Rental',  vehicleUse: 'Rental Use' },
  { leaseType: 'Lakelife Rental', contractStructure: 'Rental / Short-Term',   customerType: 'Lakelife Rental',  vehicleUse: 'Rental Use' },
]

const DEPARTMENTS = [
  'Chrysler of Forest City',
  "Pritchard's Lake Chevrolet",
  'Mason City Motor Co. - GMC',
  'Other',
]

const ALL_LEASE_TYPES = Array.from(new Set(LEASE_MAPPINGS.map((m) => m.leaseType)))

function getContractStructures(leaseType: string): string[] {
  return Array.from(new Set(
    LEASE_MAPPINGS.filter((m) => m.leaseType === leaseType).map((m) => m.contractStructure)
  ))
}

function getCustomerTypes(leaseType: string, contractStructure: string): string[] {
  return Array.from(new Set(
    LEASE_MAPPINGS
      .filter((m) => m.leaseType === leaseType && m.contractStructure === contractStructure)
      .map((m) => m.customerType)
  ))
}

function getVehicleUses(leaseType: string, contractStructure: string, customerType: string): string[] {
  return Array.from(new Set(
    LEASE_MAPPINGS
      .filter((m) => m.leaseType === leaseType && m.contractStructure === contractStructure && m.customerType === customerType)
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
    <div className="rounded-lg border border-[#D6E4FF] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-[#F5F9FF] px-4 py-3 text-left hover:bg-[#EBF2FF] transition-colors"
      >
        <span className="text-sm font-bold text-[#1E3A8A]">{title}</span>
        {open
          ? <ChevronDown size={16} className="text-[#1E3A8A]/50 shrink-0" />
          : <ChevronRight size={16} className="text-[#1E3A8A]/50 shrink-0" />
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

  const lessorName        = watch('lessorName')
  const leaseType         = watch('leaseType')         ?? 'Core'
  const contractStructure = watch('contractStructure') ?? 'Closed-End Lease'
  const customerType      = watch('customerType')      ?? 'Business'
  const vehicleUse        = watch('vehicleUse')        ?? 'Standard Customer Use'
  const department        = watch('department')        ?? ''
  const lesseeType        = watch('lesseeType')        ?? 'business'

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
    const structures = getContractStructures(lt)
    const newCs = structures[0] ?? ''
    setValue('contractStructure', newCs)
    const availableCustomerTypes = getCustomerTypes(lt, newCs)
    const newCt = availableCustomerTypes[0] ?? ''
    setValue('customerType', newCt)
    setValue('vehicleUse', getVehicleUses(lt, newCs, newCt)[0] ?? '')
    setValue('department', '')
    setValue('departmentOther', '')
  }

  function handleContractStructureChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cs = e.target.value
    setValue('contractStructure', cs)
    const availableCustomerTypes = getCustomerTypes(leaseType, cs)
    const newCt = availableCustomerTypes[0] ?? ''
    setValue('customerType', newCt)
    setValue('vehicleUse', getVehicleUses(leaseType, cs, newCt)[0] ?? '')
    setValue('department', '')
    setValue('departmentOther', '')
  }

  function handleCustomerTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const ct = e.target.value
    setValue('customerType', ct)
    setValue('vehicleUse', getVehicleUses(leaseType, contractStructure, ct)[0] ?? '')
    setValue('department', '')
    setValue('departmentOther', '')
  }

  const [leaseSetupOpen, setLeaseSetupOpen] = useState(false)

  const availableContractStructures = getContractStructures(leaseType)
  const availableCustomerTypes      = getCustomerTypes(leaseType, contractStructure)
  const availableVehicleUses        = getVehicleUses(leaseType, contractStructure, customerType)
  const isInternal                  = customerType === 'Internal'
  const showDeptOther               = department === 'Other'
  const departmentOther             = watch('departmentOther') ?? ''
  const deptLabel                   = department === 'Other' ? departmentOther : department
  const classificationComplete      = !!(leaseType && contractStructure && customerType && vehicleUse)

  const isBusiness    = lesseeType === 'business'
  const isIndividual  = lesseeType === 'individual'
  const typeSelected  = isBusiness || isIndividual

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Parties</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the lessee and lessor details for this lease agreement.
        </p>
      </div>

      <div className="space-y-3">

        {/* ── Lease Setup ── */}
        <div className="rounded-lg border border-[#D6E4FF] overflow-hidden">
          <button
            type="button"
            onClick={() => setLeaseSetupOpen((o) => !o)}
            className="flex w-full items-center justify-between bg-[#F5F9FF] px-4 py-3 text-left hover:bg-[#EBF2FF] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold text-[#1E3A8A]">Lease Setup</span>
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
                    {contractStructure}
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
              ? <ChevronDown size={16} className="text-[#1E3A8A]/50 shrink-0" />
              : <ChevronRight size={16} className="text-[#1E3A8A]/50 shrink-0" />
            }
          </button>

          {leaseSetupOpen && (
            <div className="px-4 py-4 bg-white">

              {/* Four dropdowns in 2×2 grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* A — Lease Type */}
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
                  <p className="mt-1 text-xs text-gray-400">Product line for this agreement</p>
                  {errors.leaseType && <p className="field-error">{errors.leaseType.message}</p>}
                </div>

                {/* B — Contract Structure */}
                <div>
                  <label className="label">
                    Contract Structure <span className="req">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register('contractStructure', { required: 'Select a contract structure' })}
                      value={contractStructure}
                      onChange={handleContractStructureChange}
                      className="input appearance-none pr-8"
                    >
                      {availableContractStructures.map((cs) => (
                        <option key={cs} value={cs}>{cs}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Legal structure of the contract</p>
                  {errors.contractStructure && <p className="field-error">{errors.contractStructure.message}</p>}
                </div>

                {/* C — Customer Type */}
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

                {/* D — Vehicle Use */}
                <div>
                  <label className="label">
                    Vehicle Use <span className="req">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register('vehicleUse', { required: 'Select a vehicle use' })}
                      value={vehicleUse}
                      className="input appearance-none pr-8"
                    >
                      {availableVehicleUses.map((vu) => (
                        <option key={vu} value={vu}>{vu}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Intended purpose of the vehicle</p>
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
                    {contractStructure}
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

        {/* ── Lessee Details ── */}
        <CollapsibleSection title="Lessee Details">

          {/* ── Business / Individual radio ── */}
          <div className="sm:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Lessee Type</p>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  value="business"
                  {...register('lesseeType')}
                  checked={isBusiness}
                  onChange={() => setValue('lesseeType', 'business')}
                  className="accent-brand-600"
                />
                <span className="font-medium text-gray-700">Business</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  value="individual"
                  {...register('lesseeType')}
                  checked={isIndividual}
                  onChange={() => setValue('lesseeType', 'individual')}
                  className="accent-brand-600"
                />
                <span className="font-medium text-gray-700">Individual</span>
              </label>
            </div>
          </div>

          {/* Prompt when nothing selected yet */}
          {!typeSelected && (
            <div className="sm:col-span-6">
              <p className="text-sm text-gray-400 italic">Select a lessee type above to continue.</p>
            </div>
          )}

          {/* ── Business fields ── */}
          {isBusiness && (
            <>
              {/* Business Name — full width */}
              <div className="sm:col-span-6">
                <label className="label">Business Name <span className="req">*</span></label>
                <input
                  {...register('lesseeName', { required: isBusiness ? 'Required' : false })}
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

              {/* City + State + ZIP */}
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
                <select {...register('state', { required: 'Required' })} className="input">
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

              {/* Location (optional) */}
              <div className="sm:col-span-6">
                <label className="label">Location</label>
                <input
                  {...register('location')}
                  placeholder="e.g. Branch Office – Des Moines"
                  className="input"
                />
                <p className="mt-1 text-xs text-gray-400">Optional — secondary location or branch descriptor</p>
              </div>

              {/* Phone + Email */}
              <div className="sm:col-span-2">
                <label className="label">Phone</label>
                <input
                  {...register('phone', {
                    validate: (v) => !v || PHONE_REGEX.test(v) || 'Enter a valid US phone number',
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
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                  })}
                  placeholder="joel@example.com"
                  type="email"
                  className="input"
                />
                {errors.email && <p className="field-error">{errors.email.message}</p>}
              </div>

              {/* ── Billing Contact (form-only, not on documents) ── */}
              <div className="sm:col-span-6">
                <div className="border-t border-gray-100 pt-4 mt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Billing Contact <span className="normal-case font-normal text-gray-400">(internal only — not on lease documents)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <label className="label">First Name</label>
                      <input
                        {...register('billingContactFirstName')}
                        placeholder="Jane"
                        className="input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Last Name</label>
                      <input
                        {...register('billingContactLastName')}
                        placeholder="Smith"
                        className="input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Email</label>
                      <input
                        {...register('billingContactEmail', {
                          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                        })}
                        placeholder="billing@example.com"
                        type="email"
                        className="input"
                      />
                      {errors.billingContactEmail && (
                        <p className="field-error">{errors.billingContactEmail.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Individual fields ── */}
          {isIndividual && (
            <>
              {/* First + Last Name */}
              <div className="sm:col-span-3">
                <label className="label">First Name <span className="req">*</span></label>
                <input
                  {...register('lesseeFirstName', { required: isIndividual ? 'Required' : false })}
                  placeholder="John"
                  className="input"
                />
                {errors.lesseeFirstName && <p className="field-error">{errors.lesseeFirstName.message}</p>}
              </div>
              <div className="sm:col-span-3">
                <label className="label">Last Name <span className="req">*</span></label>
                <input
                  {...register('lesseeLastName', { required: isIndividual ? 'Required' : false })}
                  placeholder="Smith"
                  className="input"
                />
                {errors.lesseeLastName && <p className="field-error">{errors.lesseeLastName.message}</p>}
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

              {/* City + State + ZIP */}
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
                <select {...register('state', { required: 'Required' })} className="input">
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

              {/* Phone + Email */}
              <div className="sm:col-span-2">
                <label className="label">Phone</label>
                <input
                  {...register('phone', {
                    validate: (v) => !v || PHONE_REGEX.test(v) || 'Enter a valid US phone number',
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
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                  })}
                  placeholder="john.smith@example.com"
                  type="email"
                  className="input"
                />
                {errors.email && <p className="field-error">{errors.email.message}</p>}
              </div>
            </>
          )}

        </CollapsibleSection>

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

      </div>
    </div>
  )
}
