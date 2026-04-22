'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { LeaseFormData, FinancialInputs, VehicleOnOrderSummary } from '@/lib/types'
import { calculateLease, fmt, fmtDate, ordinal } from '@/lib/calculations'
import { Pencil, Check } from 'lucide-react'

interface Props {
  form: UseFormReturn<LeaseFormData>
  isMasterLease?: boolean
}

// ─── Safe display helpers ─────────────────────────────────────────────────────

/** Returns undefined (→ "—") for any falsy, NaN, or literal "undefined"/"NaN" value. */
function safe(v: string | number | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return undefined
  return s
}

/** Joins non-empty parts into a single string, returns undefined if all empty. */
function join(...parts: (string | number | null | undefined)[]): string | undefined {
  const filtered = parts.map((p) => safe(p)).filter(Boolean) as string[]
  return filtered.length ? filtered.join(' ') : undefined
}

/** Formats City, State ZIP — handles any missing pieces. */
function cityStateZip(
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined,
): string | undefined {
  const c = safe(city)
  const s = safe(state)
  const z = safe(zip)
  if (!c && !s && !z) return undefined
  const stateZip = [s, z].filter(Boolean).join(' ')
  return [c, stateZip].filter(Boolean).join(', ')
}

/** Guards fmt() from NaN / Infinity. */
function safeFmt(n: number): string {
  return isNaN(n) || !isFinite(n) ? '—' : fmt(n)
}

// ─── Read-only row ────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  const display = safe(value as string) ?? '—'
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right max-w-[60%]">{display}</span>
    </div>
  )
}

// ─── Editable row ─────────────────────────────────────────────────────────────

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm border-b border-gray-100 last:border-0 gap-3">
      <span className="text-gray-500 shrink-0 w-40">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

const inputCls =
  'w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-right text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200'

const selectCls =
  'w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200'

/** Money input with $ prefix — mirrors Step4Financials style. */
function MoneyEditInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-gray-400 text-sm">$</span>
      <input
        {...props}
        type="number"
        step="0.01"
        min="0"
        className="w-full rounded border border-gray-300 bg-white pl-6 pr-2 py-1 text-sm text-right text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
      />
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  sectionKey,
  editingSection,
  onToggle,
  readView,
  editView,
}: {
  title: string
  sectionKey: string
  editingSection: string | null
  onToggle: (key: string | null) => void
  readView: React.ReactNode
  editView: React.ReactNode
}) {
  const isEditing = editingSection === sectionKey
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">{title}</h3>
        <button
          type="button"
          onClick={() => onToggle(isEditing ? null : sectionKey)}
          className="btn-ghost py-1"
        >
          {isEditing ? <Check size={11} /> : <Pencil size={11} />}
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 divide-y divide-gray-100">
        {isEditing ? editView : readView}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step5Review({ form, isMasterLease }: Props) {
  const data = form.watch()

  // Read live vehicle data from form state so edits from Step 3 are reflected here
  let masterLeaseVehicles: VehicleOnOrderSummary[] = []
  if (isMasterLease) {
    try { masterLeaseVehicles = JSON.parse(data.vehicles_json ?? '[]') } catch { /* keep empty */ }
  }
  const { register } = form

  const [editingSection, setEditingSection] = useState<string | null>(null)

  const fi: FinancialInputs = {
    leaseDate:             data.leaseDate ?? '',
    numPayments:           Number(data.numPayments) || 0,
    firstPaymentDate:      data.firstPaymentDate ?? '',
    paymentDay:            Number(data.paymentDay) || 0,
    vehicleAgreedValue:    Number(data.vehicleAgreedValue) || 0,
    taxes:                 Number(data.taxes) || 0,
    titleRegFees:          Number(data.titleRegFees) || 0,
    acquisitionFee:        Number(data.acquisitionFee) || 0,
    docFee:                Number(data.docFee) || 0,
    priorLeaseBalance:     Number(data.priorLeaseBalance) || 0,
    optionalProducts:      Number(data.optionalProducts) || 0,
    capCostReduction:      Number(data.capCostReduction) || 0,
    residualValue:         Number(data.residualValue) || 0,
    rentCharge:            Number(data.rentCharge) || 0,
    monthlySalesTax:       Number(data.monthlySalesTax) || 0,
    milesPerYear:          Number(data.milesPerYear) || 0,
    excessMileageRate:     Number(data.excessMileageRate) || 0,
    dispositionFee:        Number(data.dispositionFee) || 195,
    earlyTerminationFee:   Number(data.earlyTerminationFee) || 0,
    purchaseOptionFee:     Number(data.purchaseOptionFee) || 0,
    tradeinYear:           data.tradeinYear ?? '',
    tradeinMake:           data.tradeinMake ?? '',
    tradeinModel:          data.tradeinModel ?? '',
    tradeinGrossAllowance: Number(data.tradeinGrossAllowance) || 0,
    tradeinPriorBalance:   Number(data.tradeinPriorBalance) || 0,
    customerSignerName:    data.customerSignerName ?? '',
    customerSignerEmail:   data.customerSignerEmail ?? '',
  }

  const c = calculateLease(fi)
  const hasTradeIn = !!(data.tradeinMake && data.tradeinMake.trim())

  const paymentDay = Number(data.paymentDay)
  const milesPerYear = Number(data.milesPerYear)
  const excessRate = Number(data.excessMileageRate)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review &amp; Edit</h2>
        <p className="mt-1 text-sm text-gray-500">
          Confirm everything looks correct. Click <strong>Edit</strong> on any section to update it inline.
        </p>
      </div>

      {/* ── Vehicle / Vehicles (full width, above the 2-col grid) ────────── */}
      {isMasterLease && masterLeaseVehicles.length > 0 ? (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Vehicles ({masterLeaseVehicles.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Year</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Make</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Model</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">VIN</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Color</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Body Style</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Odometer</th>
                </tr>
              </thead>
              <tbody>
                {masterLeaseVehicles.map((v, i) => (
                  <tr key={v.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 text-gray-700">{v.model_year ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{v.oem ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{v.vehicle_line ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{v.vin ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{v.color ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{v.body_style || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{v.odometer != null ? `${v.odometer} mi` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Section
          title="Vehicle"
          sectionKey="vehicle"
          editingSection={editingSection}
          onToggle={setEditingSection}
          readView={<>
            <Row label="Condition"  value={safe(data.condition)} />
            <Row label="Year"       value={safe(data.year)} />
            <Row label="Make"       value={safe(data.make)} />
            <Row label="Model"      value={safe(data.model)} />
            {data.bodyStyle && <Row label="Body Style" value={safe(data.bodyStyle)} />}
            <Row label="VIN"        value={safe(data.vin)} />
            <Row label="Odometer"   value={safe(data.odometer) ? `${data.odometer} mi` : undefined} />
          </>}
          editView={<>
            <EditRow label="Condition">
              <select {...register('condition')} className={selectCls}>
                <option value="NEW">NEW</option>
                <option value="USED">USED</option>
              </select>
            </EditRow>
            <EditRow label="Year">
              <input {...register('year')} maxLength={4} className={inputCls} />
            </EditRow>
            <EditRow label="Make">
              <input {...register('make')} className={inputCls} />
            </EditRow>
            <EditRow label="Model">
              <input {...register('model')} className={inputCls} />
            </EditRow>
            <EditRow label="Body Style">
              <input {...register('bodyStyle')} className={inputCls} />
            </EditRow>
            <EditRow label="VIN">
              <input {...register('vin')} maxLength={17} className={inputCls} />
            </EditRow>
            <EditRow label="Odometer (mi)">
              <input {...register('odometer')} type="number" min={0} className={inputCls} />
            </EditRow>
          </>}
        />
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* ── Lessor ──────────────────────────────────────────────────────── */}
        <Section
          title="Lessor"
          sectionKey="lessor"
          editingSection={editingSection}
          onToggle={setEditingSection}
          readView={<>
            <Row label="Name"            value={safe(data.lessorName)} />
            <Row label="Address"         value={safe(data.lessorAddress)} />
            {data.lessorPoBox && <Row label="P.O. Box" value={safe(data.lessorPoBox)} />}
            <Row label="City / State / ZIP" value={cityStateZip(data.lessorCity, data.lessorState, data.lessorZip)} />
          </>}
          editView={<>
            <EditRow label="Name">
              <input {...register('lessorName')} className={inputCls} />
            </EditRow>
            <EditRow label="Address">
              <input {...register('lessorAddress')} className={inputCls} />
            </EditRow>
            <EditRow label="P.O. Box">
              <input {...register('lessorPoBox')} className={inputCls} />
            </EditRow>
            <EditRow label="City">
              <input {...register('lessorCity')} className={inputCls} />
            </EditRow>
            <EditRow label="State">
              <input {...register('lessorState')} maxLength={2} className={inputCls} />
            </EditRow>
            <EditRow label="ZIP">
              <input {...register('lessorZip')} className={inputCls} />
            </EditRow>
          </>}
        />

        {/* ── Lessee ──────────────────────────────────────────────────────── */}
        <Section
          title="Lessee"
          sectionKey="lessee"
          editingSection={editingSection}
          onToggle={setEditingSection}
          readView={<>
            <Row label="Name"    value={safe(data.lesseeName)} />
            <Row label="Address" value={safe(data.address)} />
            <Row label="City / State / ZIP" value={cityStateZip(data.city, data.state, data.zip)} />
            <Row label="Phone"   value={safe(data.phone)} />
            <Row label="Email"   value={safe(data.email)} />
          </>}
          editView={<>
            <EditRow label="Name">
              <input {...register('lesseeName')} className={inputCls} />
            </EditRow>
            <EditRow label="Address">
              <input {...register('address')} className={inputCls} />
            </EditRow>
            <EditRow label="City">
              <input {...register('city')} className={inputCls} />
            </EditRow>
            <EditRow label="State">
              <input {...register('state')} maxLength={2} className={inputCls} />
            </EditRow>
            <EditRow label="ZIP">
              <input {...register('zip')} className={inputCls} />
            </EditRow>
            <EditRow label="Phone">
              <input {...register('phone')} type="tel" className={inputCls} />
            </EditRow>
            <EditRow label="Email">
              <input {...register('email')} type="email" className={inputCls} />
            </EditRow>
          </>}
        />

        {/* ── Lease Terms ─────────────────────────────────────────────────── */}
        <Section
          title="Lease Terms"
          sectionKey="leaseTerms"
          editingSection={editingSection}
          onToggle={setEditingSection}
          readView={<>
            <Row label="Lease Date"    value={safe(fmtDate(data.leaseDate ?? ''))} />
            <Row label="Term"          value={data.numPayments ? `${data.numPayments} months` : undefined} />
            <Row label="First Payment" value={
              safe(data.firstPaymentDate) && !isNaN(c.totalMonthlyPayment)
                ? `${safeFmt(c.totalMonthlyPayment)} due ${fmtDate(data.firstPaymentDate!)}`
                : undefined
            } />
            <Row label="Recurring" value={
              paymentDay && !isNaN(paymentDay)
                ? `Due the ${ordinal(paymentDay)} of each month`
                : undefined
            } />
            <Row label="Mileage" value={
              milesPerYear
                ? `${milesPerYear.toLocaleString()} mi/yr @ $${excessRate.toFixed(2)}/mi excess`
                : undefined
            } />
          </>}
          editView={<>
            <EditRow label="Lease Date">
              <input {...register('leaseDate')} type="date" className={inputCls} />
            </EditRow>
            <EditRow label="Term (months)">
              <input {...register('numPayments')} type="number" min={1} className={inputCls} />
            </EditRow>
            <EditRow label="First Payment Date">
              <input {...register('firstPaymentDate')} type="date" className={inputCls} />
            </EditRow>
            <EditRow label="Payment Day of Month">
              <input {...register('paymentDay')} type="number" min={1} max={31} className={inputCls} />
            </EditRow>
            <EditRow label="Miles Per Year">
              <input {...register('milesPerYear')} type="number" className={inputCls} />
            </EditRow>
            <EditRow label="Excess Mileage Rate">
              <MoneyEditInput {...register('excessMileageRate')} step="0.01" />
            </EditRow>
          </>}
        />

        {/* ── Financials ──────────────────────────────────────────────────── */}
        <Section
          title="Financials"
          sectionKey="financials"
          editingSection={editingSection}
          onToggle={setEditingSection}
          readView={<>
            <Row label="Gross Cap Cost"     value={safeFmt(c.grossCapCost)} />
            <Row label="Cap Cost Reduction" value={safeFmt(fi.capCostReduction + c.netTradeinAllowance)} />
            <Row label="Adjusted Cap Cost"  value={safeFmt(c.adjustedCapCost)} />
            <Row label="Residual Value"     value={safeFmt(fi.residualValue)} />
            <Row label="Depreciation"       value={safeFmt(c.depreciation)} />
            <Row label="Rent Charge"        value={safeFmt(fi.rentCharge)} />
            <Row label="Base Monthly Pmt"   value={safeFmt(c.baseMonthlyPayment)} />
            <Row label="Monthly Tax"        value={safeFmt(fi.monthlySalesTax)} />
            <Row label="Total Monthly Pmt"  value={safeFmt(c.totalMonthlyPayment)} />
            <Row label="Total of Payments"  value={safeFmt(c.totalOfPayments)} />
            <Row label="Amt Due at Signing" value={safeFmt(c.amountDueAtSigning)} />
          </>}
          editView={<>
            <EditRow label="Vehicle Agreed Value">
              <MoneyEditInput {...register('vehicleAgreedValue')} />
            </EditRow>
            <EditRow label="Taxes">
              <MoneyEditInput {...register('taxes')} />
            </EditRow>
            <EditRow label="Title &amp; Reg Fees">
              <MoneyEditInput {...register('titleRegFees')} />
            </EditRow>
            <EditRow label="Acquisition Fee">
              <MoneyEditInput {...register('acquisitionFee')} />
            </EditRow>
            <EditRow label="Doc Fee">
              <MoneyEditInput {...register('docFee')} />
            </EditRow>
            <EditRow label="Prior Lease Balance">
              <MoneyEditInput {...register('priorLeaseBalance')} />
            </EditRow>
            <EditRow label="Optional Products">
              <MoneyEditInput {...register('optionalProducts')} />
            </EditRow>
            <EditRow label="Cap Cost Reduction">
              <MoneyEditInput {...register('capCostReduction')} />
            </EditRow>
            <EditRow label="Residual Value">
              <MoneyEditInput {...register('residualValue')} />
            </EditRow>
            <EditRow label="Rent Charge">
              <MoneyEditInput {...register('rentCharge')} />
            </EditRow>
            <EditRow label="Monthly Sales Tax">
              <MoneyEditInput {...register('monthlySalesTax')} />
            </EditRow>
          </>}
        />

        {/* ── Fees ────────────────────────────────────────────────────────── */}
        <Section
          title="Fees"
          sectionKey="fees"
          editingSection={editingSection}
          onToggle={setEditingSection}
          readView={<>
            <Row label="Disposition Fee"       value={safeFmt(Number(data.dispositionFee) || 0)} />
            <Row label="Early Termination Fee" value={safeFmt(Number(data.earlyTerminationFee) || 0)} />
            <Row label="Purchase Option Price" value={safeFmt(fi.residualValue)} />
            <Row label="Purchase Option Fee"   value={safeFmt(Number(data.purchaseOptionFee) || 0)} />
            <Row label="Official Fees & Taxes" value={safeFmt(c.officialFeesTaxes)} />
          </>}
          editView={<>
            <EditRow label="Disposition Fee">
              <MoneyEditInput {...register('dispositionFee')} />
            </EditRow>
            <EditRow label="Early Termination Fee">
              <MoneyEditInput {...register('earlyTerminationFee')} />
            </EditRow>
            <EditRow label="Purchase Option Fee">
              <MoneyEditInput {...register('purchaseOptionFee')} />
            </EditRow>
          </>}
        />

        {/* ── Trade-In ────────────────────────────────────────────────────── */}
        {(hasTradeIn || editingSection === 'tradeIn') && (
          <Section
            title="Trade-In"
            sectionKey="tradeIn"
            editingSection={editingSection}
            onToggle={setEditingSection}
            readView={<>
              <Row label="Vehicle"       value={join(data.tradeinYear, data.tradeinMake, data.tradeinModel)} />
              <Row label="Gross Allow."  value={safeFmt(Number(data.tradeinGrossAllowance) || 0)} />
              <Row label="Prior Balance" value={safeFmt(Number(data.tradeinPriorBalance) || 0)} />
              <Row label="Net Allowance" value={safeFmt(c.netTradeinAllowance)} />
            </>}
            editView={<>
              <EditRow label="Year">
                <input {...register('tradeinYear')} className={inputCls} />
              </EditRow>
              <EditRow label="Make">
                <input {...register('tradeinMake')} className={inputCls} />
              </EditRow>
              <EditRow label="Model">
                <input {...register('tradeinModel')} className={inputCls} />
              </EditRow>
              <EditRow label="Gross Allowance">
                <MoneyEditInput {...register('tradeinGrossAllowance')} />
              </EditRow>
              <EditRow label="Prior Balance">
                <MoneyEditInput {...register('tradeinPriorBalance')} />
              </EditRow>
            </>}
          />
        )}
      </div>

      {/* ── Summary highlight ──────────────────────────────────────────────── */}
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Total Monthly Payment</p>
          <p className="text-2xl font-bold text-brand-700">{safeFmt(c.totalMonthlyPayment)}</p>
          <p className="text-xs text-brand-500">× {data.numPayments || '—'} months = {safeFmt(c.totalOfPayments)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Amount Due at Signing</p>
          <p className="text-2xl font-bold text-brand-700">{safeFmt(c.amountDueAtSigning)}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        &ldquo;Preview Lease Agreement&rdquo; fills the lease template, downloads the PDF, and saves this record with status <strong>Generated</strong>.
        Use &ldquo;Save Draft&rdquo; at any step to save progress without generating the PDF.
      </p>
    </div>
  )
}
