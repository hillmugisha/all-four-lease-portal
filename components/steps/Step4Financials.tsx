'use client'

import { useState } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { LeaseFormData, FinancialInputs } from '@/lib/types'
import { calculateLease, fmt } from '@/lib/calculations'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  form: UseFormReturn<LeaseFormData>
}

// ─── Collapsible section wrapper ─────────────────────────────────────────────

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

// ─── Money input ──────────────────────────────────────────────────────────────

function MoneyInput({
  label, name, form, required, hint, placeholder = '0.00', colSpan,
}: {
  label: string
  name: keyof LeaseFormData
  form: UseFormReturn<LeaseFormData>
  required?: boolean
  hint?: string
  placeholder?: string
  colSpan?: string
}) {
  const { register, formState: { errors } } = form
  const err = errors[name]
  return (
    <div className={colSpan}>
      <label className="label">
        {label}{required && <span className="req"> *</span>}
      </label>
      {hint && <p className="mb-1 text-xs text-gray-400">{hint}</p>}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
        <input
          {...register(name, {
            required: required ? 'Required' : false,
            valueAsNumber: true,
            min: { value: 0, message: 'Must be ≥ 0' },
          })}
          type="number"
          step="0.01"
          min="0"
          placeholder={placeholder}
          className="input pl-7"
        />
      </div>
      {err && <p className="field-error">{err.message as string}</p>}
    </div>
  )
}

// ─── Live calc summary panel ──────────────────────────────────────────────────

function CalcSummary({ form }: { form: UseFormReturn<LeaseFormData> }) {
  const watched = useWatch({ control: form.control }) as Partial<FinancialInputs>

  const fi: FinancialInputs = {
    leaseDate:             watched.leaseDate ?? '',
    numPayments:           Number(watched.numPayments ?? 24),
    firstPaymentDate:      watched.firstPaymentDate ?? '',
    paymentDay:            Number(watched.paymentDay ?? 1),
    vehicleAgreedValue:    Number(watched.vehicleAgreedValue ?? 0),
    taxes:                 Number(watched.taxes ?? 0),
    titleRegFees:          Number(watched.titleRegFees ?? 0),
    acquisitionFee:        Number(watched.acquisitionFee ?? 0),
    docFee:                Number(watched.docFee ?? 0),
    priorLeaseBalance:     Number(watched.priorLeaseBalance ?? 0),
    optionalProducts:      Number(watched.optionalProducts ?? 0),
    capCostReduction:      Number(watched.capCostReduction ?? 0),
    residualValue:         Number(watched.residualValue ?? 0),
    rentCharge:            Number(watched.rentCharge ?? 0),
    monthlySalesTax:       Number(watched.monthlySalesTax ?? 0),
    milesPerYear:          Number(watched.milesPerYear ?? 15000),
    excessMileageRate:     Number(watched.excessMileageRate ?? 0.25),
    dispositionFee:        Number(watched.dispositionFee ?? 195),
    earlyTerminationFee:   Number(watched.earlyTerminationFee ?? 0),
    purchaseOptionFee:     Number(watched.purchaseOptionFee ?? 0),
    tradeinYear:           watched.tradeinYear ?? '',
    tradeinMake:           watched.tradeinMake ?? '',
    tradeinModel:          watched.tradeinModel ?? '',
    tradeinGrossAllowance: Number(watched.tradeinGrossAllowance ?? 0),
    tradeinPriorBalance:   Number(watched.tradeinPriorBalance ?? 0),
    customerSignerName:    '',
    customerSignerEmail:   '',
  }

  const c = calculateLease(fi)

  const rows: [string, string][] = [
    ['Gross Cap Cost',          fmt(c.grossCapCost)],
    ['− Cap Cost Reduction',    fmt(fi.capCostReduction + c.netTradeinAllowance)],
    ['= Adjusted Cap Cost',     fmt(c.adjustedCapCost)],
    ['− Residual Value',        fmt(fi.residualValue)],
    ['= Depreciation',          fmt(c.depreciation)],
    ['+ Rent Charge',           fmt(fi.rentCharge)],
    ['= Total Base Mo. Pmts',   fmt(c.totalBaseMonthlyPayments)],
    ['÷ Term (months)',         String(fi.numPayments)],
    ['= Base Monthly Pmt',      fmt(c.baseMonthlyPayment)],
    ['+ Monthly Tax',           fmt(fi.monthlySalesTax)],
  ]

  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 space-y-1.5 sticky top-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-3">Live Calculation</p>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between text-xs">
          <span className="text-gray-500">{label}</span>
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      ))}
      <div className="mt-3 border-t border-brand-200 pt-3 flex justify-between items-baseline">
        <span className="text-sm font-semibold text-brand-900">Monthly Payment</span>
        <span className="text-xl font-bold text-brand-600">{fmt(c.totalMonthlyPayment)}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Total of payments</span>
        <span>{fmt(c.totalOfPayments)}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Amt due at signing</span>
        <span>{fmt(c.amountDueAtSigning)}</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step4Financials({ form }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Lease Financials</h2>
        <p className="mt-1 text-sm text-gray-500">
          Expand each section to fill in the deal details. Monthly payment calculates automatically on the right.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: collapsible sections */}
        <div className="lg:col-span-2 space-y-3">

          {/* ── Lease Terms ── */}
          <CollapsibleSection title="Lease Terms">
            <div>
              <label className="label">Lease Date <span className="req">*</span></label>
              <input {...form.register('leaseDate', { required: 'Required' })} type="date" className="input" />
              {form.formState.errors.leaseDate && <p className="field-error">{form.formState.errors.leaseDate.message}</p>}
            </div>
            <div>
              <label className="label">Term (months) <span className="req">*</span></label>
              <input {...form.register('numPayments', { required: 'Required', valueAsNumber: true, min: 1 })} type="number" placeholder="24" className="input" />
            </div>
            <div>
              <label className="label">First Payment Date <span className="req">*</span></label>
              <input {...form.register('firstPaymentDate', { required: 'Required' })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Payment Day of Month <span className="req">*</span></label>
              <input {...form.register('paymentDay', { required: 'Required', valueAsNumber: true, min: 1, max: 31 })} type="number" placeholder="21" min={1} max={31} className="input" />
            </div>
            <div>
              <label className="label">Miles Per Year <span className="req">*</span></label>
              <input {...form.register('milesPerYear', { required: 'Required', valueAsNumber: true })} type="number" placeholder="15000" className="input" />
            </div>
            <div>
              <label className="label">Excess Mileage Rate ($/mi) <span className="req">*</span></label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                <input {...form.register('excessMileageRate', { required: 'Required', valueAsNumber: true })} type="number" step="0.01" placeholder="0.25" className="input pl-7" />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Gross Cap Cost ── */}
          <CollapsibleSection title="Gross Capitalized Cost">
            <MoneyInput label="Vehicle Agreed Value" name="vehicleAgreedValue" form={form} required />
            <MoneyInput label="Taxes"                name="taxes"             form={form} required />
            <MoneyInput label="Title & Reg Fees"     name="titleRegFees"      form={form} required />
            <MoneyInput label="Acquisition Fee"      name="acquisitionFee"    form={form} required />
            <MoneyInput label="Documentation Fee"    name="docFee"            form={form} required />
            <MoneyInput label="Prior Lease Balance"  name="priorLeaseBalance" form={form} />
            <MoneyInput label="Optional Products" name="optionalProducts" form={form} hint="MBP + Service Contract + Gap combined" />
          </CollapsibleSection>

          {/* ── Deal Economics ── */}
          <CollapsibleSection title="Deal Economics">
            <MoneyInput label="Cap Cost Reduction" name="capCostReduction" form={form} hint="Cash down + rebates (excl. trade-in)" />
            <MoneyInput label="Residual Value"     name="residualValue"   form={form} required />
            <MoneyInput label="Rent Charge"        name="rentCharge"      form={form} required />
            <MoneyInput label="Monthly Sales Tax"  name="monthlySalesTax" form={form} />
          </CollapsibleSection>

          {/* ── Fees ── */}
          <CollapsibleSection title="Fees">
            <MoneyInput label="Disposition Fee"       name="dispositionFee"      form={form} placeholder="195.00" />
            <MoneyInput label="Early Termination Fee" name="earlyTerminationFee" form={form} />
            <MoneyInput label="Purchase Option Fee"   name="purchaseOptionFee"   form={form} />
          </CollapsibleSection>

          {/* ── Trade-In ── */}
          <CollapsibleSection title="Trade-In (optional)">
            <div>
              <label className="label">Year</label>
              <input {...form.register('tradeinYear')} placeholder="2022" className="input" />
            </div>
            <div>
              <label className="label">Make</label>
              <input {...form.register('tradeinMake')} placeholder="Ford" className="input" />
            </div>
            <div>
              <label className="label">Model</label>
              <input {...form.register('tradeinModel')} placeholder="F-150" className="input" />
            </div>
            <MoneyInput label="Gross Allowance" name="tradeinGrossAllowance" form={form} />
            <MoneyInput label="Prior Balance"   name="tradeinPriorBalance"   form={form} />
          </CollapsibleSection>

        </div>

        {/* Right: live calc panel */}
        <div>
          <CalcSummary form={form} />
        </div>
      </div>
    </div>
  )
}
