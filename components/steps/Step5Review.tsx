'use client'

import { LeaseFormData, FinancialInputs } from '@/lib/types'
import { calculateLease, fmt, fmtDate, ordinal } from '@/lib/calculations'
import { Pencil } from 'lucide-react'

interface Props {
  data: LeaseFormData
  goToStep: (step: number) => void
}

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right max-w-[60%]">{value ?? '—'}</span>
    </div>
  )
}

function Section({
  title,
  step,
  goToStep,
  children,
}: {
  title: string
  step: number
  goToStep: (n: number) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
        <button
          type="button"
          onClick={() => goToStep(step)}
          className="btn-ghost py-1"
        >
          <Pencil size={11} />
          Edit
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 divide-y divide-gray-100">
        {children}
      </div>
    </div>
  )
}

export default function Step5Review({ data, goToStep }: Props) {
  const fi: FinancialInputs = {
    leaseDate:             data.leaseDate,
    numPayments:           Number(data.numPayments),
    firstPaymentDate:      data.firstPaymentDate,
    paymentDay:            Number(data.paymentDay),
    vehicleAgreedValue:    Number(data.vehicleAgreedValue),
    taxes:                 Number(data.taxes),
    titleRegFees:          Number(data.titleRegFees),
    acquisitionFee:        Number(data.acquisitionFee),
    docFee:                Number(data.docFee),
    priorLeaseBalance:     Number(data.priorLeaseBalance ?? 0),
    optionalProducts:      Number(data.optionalProducts ?? 0),
    capCostReduction:      Number(data.capCostReduction ?? 0),
    residualValue:         Number(data.residualValue),
    rentCharge:            Number(data.rentCharge),
    monthlySalesTax:       Number(data.monthlySalesTax ?? 0),
    milesPerYear:          Number(data.milesPerYear),
    excessMileageRate:     Number(data.excessMileageRate),
    dispositionFee:        Number(data.dispositionFee ?? 195),
    earlyTerminationFee:   Number(data.earlyTerminationFee ?? 0),
    purchaseOptionFee:     Number(data.purchaseOptionFee ?? 0),
    tradeinYear:           data.tradeinYear ?? '',
    tradeinMake:           data.tradeinMake ?? '',
    tradeinModel:          data.tradeinModel ?? '',
    tradeinGrossAllowance: Number(data.tradeinGrossAllowance ?? 0),
    tradeinPriorBalance:   Number(data.tradeinPriorBalance ?? 0),
    customerSignerName:    data.customerSignerName ?? '',
    customerSignerEmail:   data.customerSignerEmail ?? '',
  }

  const c = calculateLease(fi)
  const hasTradeIn = !!(data.tradeinMake && data.tradeinMake.trim())

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review & Generate</h2>
        <p className="mt-1 text-sm text-gray-500">
          Confirm everything looks correct. Click <strong>Edit</strong> on any section to jump back and make changes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        <Section title="Lessor" step={1} goToStep={goToStep}>
          <Row label="Name"            value={data.lessorName} />
          <Row label="Address"         value={data.lessorAddress} />
          {data.lessorPoBox && <Row label="P.O. Box" value={data.lessorPoBox} />}
          <Row label="City / State / ZIP" value={`${data.lessorCity}, ${data.lessorState} ${data.lessorZip}`} />
        </Section>

        <Section title="Lessee" step={1} goToStep={goToStep}>
          <Row label="Name"            value={data.lesseeName} />
          <Row label="Address"         value={data.address} />
          <Row label="City / State / ZIP" value={`${data.city}, ${data.state} ${data.zip}`} />
          <Row label="Phone"           value={data.phone} />
          <Row label="Email"           value={data.email} />
        </Section>

        <Section title="Vehicle" step={2} goToStep={goToStep}>
          <Row label="Condition"   value={data.condition} />
          <Row label="Year / Make" value={`${data.year} ${data.make}`} />
          <Row label="Model"       value={data.model} />
          {data.bodyStyle && <Row label="Body Style" value={data.bodyStyle} />}
          <Row label="VIN"         value={data.vin} />
          <Row label="Odometer"    value={data.odometer ? `${data.odometer} mi` : undefined} />
        </Section>

        <Section title="Lease Terms" step={3} goToStep={goToStep}>
          <Row label="Lease Date"        value={fmtDate(data.leaseDate)} />
          <Row label="Term"              value={`${data.numPayments} months`} />
          <Row label="First Payment"     value={`${fmt(c.totalMonthlyPayment)} due ${fmtDate(data.firstPaymentDate)}`} />
          <Row label="Recurring"         value={`Due the ${ordinal(Number(data.paymentDay))} of each month`} />
          <Row label="Mileage"           value={`${Number(data.milesPerYear).toLocaleString()} mi/yr @ $${Number(data.excessMileageRate).toFixed(2)}/mi excess`} />
        </Section>

        <Section title="Financials" step={3} goToStep={goToStep}>
          <Row label="Gross Cap Cost"       value={fmt(c.grossCapCost)} />
          <Row label="Cap Cost Reduction"   value={fmt(fi.capCostReduction + c.netTradeinAllowance)} />
          <Row label="Adjusted Cap Cost"    value={fmt(c.adjustedCapCost)} />
          <Row label="Residual Value"       value={fmt(fi.residualValue)} />
          <Row label="Depreciation"         value={fmt(c.depreciation)} />
          <Row label="Rent Charge"          value={fmt(fi.rentCharge)} />
          <Row label="Base Monthly Pmt"     value={fmt(c.baseMonthlyPayment)} />
          <Row label="Monthly Tax"          value={fmt(fi.monthlySalesTax)} />
          <Row label="Total Monthly Pmt"    value={fmt(c.totalMonthlyPayment)} />
          <Row label="Total of Payments"    value={fmt(c.totalOfPayments)} />
          <Row label="Amt Due at Signing"   value={fmt(c.amountDueAtSigning)} />
        </Section>

        <Section title="Fees" step={3} goToStep={goToStep}>
          <Row label="Disposition Fee"       value={fmt(Number(data.dispositionFee))} />
          <Row label="Early Termination Fee" value={fmt(Number(data.earlyTerminationFee))} />
          <Row label="Purchase Option Price" value={fmt(fi.residualValue)} />
          <Row label="Purchase Option Fee"   value={fmt(Number(data.purchaseOptionFee))} />
          <Row label="Official Fees & Taxes" value={fmt(c.officialFeesTaxes)} />
        </Section>

        {hasTradeIn && (
          <Section title="Trade-In" step={3} goToStep={goToStep}>
            <Row label="Vehicle"       value={`${data.tradeinYear} ${data.tradeinMake} ${data.tradeinModel}`} />
            <Row label="Gross Allow."  value={fmt(Number(data.tradeinGrossAllowance))} />
            <Row label="Prior Balance" value={fmt(Number(data.tradeinPriorBalance))} />
            <Row label="Net Allowance" value={fmt(c.netTradeinAllowance)} />
          </Section>
        )}
      </div>

      {/* Summary highlight */}
      <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm text-brand-700 font-medium">Total Monthly Payment</p>
          <p className="text-3xl font-bold text-brand-900">{fmt(c.totalMonthlyPayment)}</p>
          <p className="text-sm text-brand-600 mt-0.5">
            × {data.numPayments} months = {fmt(c.totalOfPayments)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-brand-700 font-medium">Amount Due at Signing</p>
          <p className="text-2xl font-bold text-brand-900">{fmt(c.amountDueAtSigning)}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        "Generate PDF & Save" fills the lease template, downloads the PDF, and saves this record with status <strong>Generated</strong>.
        Use "Save Draft" at any step to save progress without generating the PDF.
      </p>
    </div>
  )
}
