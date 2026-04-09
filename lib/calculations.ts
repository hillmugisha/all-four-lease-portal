import { FinancialInputs, CalculatedFields } from './types'

/**
 * All financial fields that can be derived from the user's inputs.
 * Called on every change in Step 3 so the UI stays in sync.
 */
export function calculateLease(f: FinancialInputs): CalculatedFields {
  const grossCapCost =
    (f.vehicleAgreedValue || 0) +
    (f.taxes || 0) +
    (f.titleRegFees || 0) +
    (f.acquisitionFee || 0) +
    (f.docFee || 0) +
    (f.priorLeaseBalance || 0) +
    (f.optionalProducts || 0)

  const netTradeinAllowance = Math.max(
    0,
    (f.tradeinGrossAllowance || 0) - (f.tradeinPriorBalance || 0)
  )

  // Cap cost reduction = cash down + trade-in net + rebates (all rolled into one input)
  const totalCapCostReduction = (f.capCostReduction || 0) + netTradeinAllowance

  const adjustedCapCost = Math.max(0, grossCapCost - totalCapCostReduction)

  const depreciation = Math.max(0, adjustedCapCost - (f.residualValue || 0))

  const totalBaseMonthlyPayments = depreciation + (f.rentCharge || 0)

  const months = f.numPayments || 1
  const baseMonthlyPayment = totalBaseMonthlyPayments / months

  const totalMonthlyPayment = baseMonthlyPayment + (f.monthlySalesTax || 0)

  const totalOfPayments = totalMonthlyPayment * months

  // Amount due at signing = first month payment (common default; can include cap cost reduction cash)
  const amountDueAtSigning = totalMonthlyPayment

  const officialFeesTaxes = (f.taxes || 0) + (f.titleRegFees || 0)

  return {
    grossCapCost,
    netTradeinAllowance,
    adjustedCapCost,
    depreciation,
    totalBaseMonthlyPayments,
    baseMonthlyPayment,
    totalMonthlyPayment,
    totalOfPayments,
    amountDueAtSigning,
    officialFeesTaxes,
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function fmtOr(value: number, fallback = 'N/A'): string {
  if (!value || value === 0) return fallback
  return fmt(value)
}

/** Format a date string (YYYY-MM-DD) as "Month Day, Year" */
export function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/** Ordinal suffix: 1→"1st", 21→"21st" etc. */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
