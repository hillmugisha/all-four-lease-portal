/**
 * lease-renderer.ts
 * Renders the Handlebars lease HTML template with computed/formatted data.
 * Usage (server-side only — uses fs):
 *   import { renderLease } from '@/lib/lease-renderer'
 *   const html = renderLease(data)
 *   // Then pass html to Puppeteer page.setContent(html) → page.pdf()
 */

import Handlebars from 'handlebars'
import fs from 'fs'
import path from 'path'
import type { LeaseTemplateData } from './lease-types'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A'
  return n.toLocaleString('en-US')
}

function fmtDate(iso: string | null | undefined, style: 'long' | 'short' = 'long'): string {
  if (!iso) return 'N/A'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (style === 'short') {
    return `${m}/${d}/${y}`
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function naOrFmt(n: number | null | undefined): string {
  return n === null || n === undefined ? 'N/A' : fmt(n)
}

function naOrStr(s: string | null | undefined, fallback = 'N/A'): string {
  return s ?? fallback
}

// ─── Register Handlebars helpers ──────────────────────────────────────────────

Handlebars.registerHelper('fmt', (n: unknown) => fmt(n as number | null))
Handlebars.registerHelper('fmtNum', (n: unknown) => fmtNum(n as number | null))
Handlebars.registerHelper('fmtDate', (s: unknown) => fmtDate(s as string))
Handlebars.registerHelper('fmtDateShort', (s: unknown) => fmtDate(s as string, 'short'))
Handlebars.registerHelper('naOrFmt', (n: unknown) => naOrFmt(n as number | null))
Handlebars.registerHelper('naOrStr', (s: unknown) => naOrStr(s as string | null))
Handlebars.registerHelper('ordinal', (n: unknown) => ordinal(Number(n)))
Handlebars.registerHelper('checked', (v: unknown) => v ? '[X]' : '[&nbsp;&nbsp;&nbsp;]')
Handlebars.registerHelper('checkedIf', (a: unknown, b: unknown) =>
  String(a) === String(b) ? '&#x2611;' : '&#x2610;'
)
// {{fmtRate 0.25}} → "$0.25"
Handlebars.registerHelper('fmtRate', (n: unknown) =>
  (n as number).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
)
// Subtraction helper for num_remaining_payments = numPayments - 1
Handlebars.registerHelper('minus', (a: unknown, b: unknown) => Number(a) - Number(b))

// ─── Build computed view model ────────────────────────────────────────────────

function buildViewModel(data: LeaseTemplateData) {
  const { lease, lessor, lessee, vehicle, financials, signing, tradein, cap_items, optional, signatures } = data

  // Itemization totals
  const itemLines = [
    signing.cap_cost_reduction ?? 0,
    signing.first_monthly_payment,
    signing.security_deposit ?? 0,
    signing.reconditioning_reserve ?? 0,
    signing.title_fees ?? 0,
    signing.registration_fees ?? 0,
    signing.other_1_amount ?? 0,
    signing.other_2_amount ?? 0,
  ]
  const signingTotal = itemLines.reduce((a, b) => a + b, 0)

  const howPaidTotal = (signing.net_tradein_allowance ?? 0)
    + (signing.rebates_noncash ?? 0)
    + (signing.amount_paid_in_cash ?? 0)

  // Other charges (Section 3 top-right)
  // Disposition fee appears here only if it was included in signing itemization.
  // Per standard CLA, it appears as a line item under "Other Charges" in the main
  // disclosures table when it is NOT part of signing amount.
  const otherChargesTotal = financials.disposition_fee ?? 0

  return {
    lease: {
      ...lease,
      lease_date_short: fmtDate(lease.lease_date, 'short'),
    },
    lessor,
    lessee,
    vehicle,
    financials: {
      ...financials,
      // Pre-formatted values for direct insertion
      f_vehicle_agreed_value:       fmt(financials.vehicle_agreed_value),
      f_gross_cap_cost:             fmt(financials.gross_cap_cost),
      f_cap_cost_reduction:         naOrFmt(financials.cap_cost_reduction),
      f_adjusted_cap_cost:          fmt(financials.adjusted_cap_cost),
      f_residual_value:             fmt(financials.residual_value),
      f_depreciation:               fmt(financials.depreciation),
      f_rent_charge:                fmt(financials.rent_charge),
      f_total_base_monthly:         fmt(financials.total_base_monthly_payments),
      f_base_monthly:               fmt(financials.base_monthly_payment),
      f_monthly_tax:                naOrFmt(financials.monthly_sales_tax),
      f_total_monthly:              fmt(financials.total_monthly_payment),
      f_total_of_payments:          fmt(financials.total_of_payments),
      f_miles_per_year:             fmtNum(financials.miles_per_year),
      f_excess_rate:                financials.excess_mileage_rate.toFixed(2),
      f_disposition:                naOrFmt(financials.disposition_fee),
      f_early_term:                 naOrFmt(financials.early_termination_fee),
      f_purchase_option_price:      fmt(financials.purchase_option_price),
      f_purchase_option_fee:        naOrFmt(financials.purchase_option_fee),
      f_official_fees:              fmt(financials.official_fees_taxes),
      f_other_charges_total:        otherChargesTotal > 0 ? fmt(otherChargesTotal) : 'N/A',
    },
    signing: {
      ...signing,
      num_remaining_payments: financials.num_payments - 1,
      first_payment_date_long: fmtDate(signing.first_payment_date),
      payment_day_ordinal: ordinal(signing.payment_day),
      f_amount_due:          fmt(signing.amount_due_at_signing),
      f_cap_cost_reduction:  naOrFmt(signing.cap_cost_reduction),
      f_first_monthly:       fmt(signing.first_monthly_payment),
      f_security_deposit:    naOrFmt(signing.security_deposit),
      f_reconditioning:      naOrFmt(signing.reconditioning_reserve),
      f_title_fees:          naOrFmt(signing.title_fees),
      f_reg_fees:            naOrFmt(signing.registration_fees),
      f_other_1_label:       naOrStr(signing.other_1_label),
      f_other_1_amount:      naOrFmt(signing.other_1_amount),
      f_other_2_label:       naOrStr(signing.other_2_label),
      f_other_2_amount:      naOrFmt(signing.other_2_amount),
      f_signing_total:       fmt(signingTotal),
      f_net_tradein:         naOrFmt(signing.net_tradein_allowance),
      f_rebates:             naOrFmt(signing.rebates_noncash),
      f_cash:                naOrFmt(signing.amount_paid_in_cash),
      f_how_paid_total:      fmt(howPaidTotal),
    },
    tradein: {
      ...tradein,
      f_year:            naOrStr(tradein.year),
      f_make:            naOrStr(tradein.make),
      f_model:           naOrStr(tradein.model),
      f_gross_allowance: naOrFmt(tradein.gross_allowance),
      f_prior_balance:   naOrFmt(tradein.prior_balance),
      f_net_allowance:   fmt(tradein.net_allowance),
    },
    cap_items: {
      ...cap_items,
      f_taxes:           fmt(cap_items.taxes),
      f_title_reg:       fmt(cap_items.title_reg_fees),
      f_acquisition:     fmt(cap_items.acquisition_fee),
      f_doc_fee:         fmt(cap_items.doc_fee),
      f_prior_balance:   naOrFmt(cap_items.prior_lease_balance),
      f_other_1_label:   naOrStr(cap_items.other_1_label),
      f_other_1_amount:  naOrFmt(cap_items.other_1_amount),
      f_mbp:             naOrFmt(cap_items.mbp_amount),
      f_service:         naOrFmt(cap_items.service_contract),
      f_gap:             naOrFmt(cap_items.gap_amount),
      f_opt_other_1_lbl: naOrStr(cap_items.optional_other_1_label),
      f_opt_other_1_amt: naOrFmt(cap_items.optional_other_1_amount),
      f_opt_other_2_lbl: naOrStr(cap_items.optional_other_2_label),
      f_opt_other_2_amt: naOrFmt(cap_items.optional_other_2_amount),
    },
    optional: {
      mbp: {
        amount_or_period: naOrStr(optional.mbp.amount_or_period),
        price:            naOrFmt(optional.mbp.price),
        term:             naOrStr(optional.mbp.term),
        provider:         naOrStr(optional.mbp.provider),
        lessee_initials:  naOrStr(optional.mbp.lessee_initials),
      },
      gap: {
        amount_or_period: naOrStr(optional.gap.amount_or_period),
        price:            naOrFmt(optional.gap.price),
        term:             naOrStr(optional.gap.term),
        provider:         naOrStr(optional.gap.provider),
        lessee_initials:  naOrStr(optional.gap.lessee_initials),
      },
    },
    signatures,
  }
}

// ─── Main render function ─────────────────────────────────────────────────────

let _compiledTemplate: HandlebarsTemplateDelegate | null = null

export function renderLease(data: LeaseTemplateData): string {
  if (!_compiledTemplate) {
    const templatePath = path.join(process.cwd(), 'templates', 'lease.html')
    const source = fs.readFileSync(templatePath, 'utf-8')
    _compiledTemplate = Handlebars.compile(source)
  }
  const vm = buildViewModel(data)
  return _compiledTemplate(vm)
}

// ─── Convert LeaseRecord (Supabase row) to LeaseTemplateData ────────────────
// Import LeaseRecord from your existing types if you want to bridge the two.
// Example adapter (add to your API route):
//
// import { renderLease } from '@/lib/lease-renderer'
// import type { LeaseRecord } from '@/lib/types'
// import type { LeaseTemplateData } from '@/lib/lease-types'
//
// function recordToTemplateData(r: LeaseRecord): LeaseTemplateData { ... }
