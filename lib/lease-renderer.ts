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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function compileTemplate(filename: string): HandlebarsTemplateDelegate {
  const templatePath = path.join(process.cwd(), 'templates', filename)
  const source = fs.readFileSync(templatePath, 'utf-8')
  return Handlebars.compile(source)
}

// Logo is static — cache the base64 data URI after the first read.
let _logoDataUri: string | null = null

function getLogoDataUri(): string {
  if (_logoDataUri !== null) return _logoDataUri
  const logoPath = path.join(process.cwd(), 'logo.webp')
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath)
    _logoDataUri = `data:image/webp;base64,${buf.toString('base64')}`
  } else {
    _logoDataUri = ''
  }
  return _logoDataUri
}

// NIE logo — loaded from "NIE logo.png" in the project root.
let _nieLogoDataUri: string | null = null

function getNieLogoDataUri(): string {
  if (_nieLogoDataUri !== null) return _nieLogoDataUri
  const logoPath = path.join(process.cwd(), 'NIE logo.png')
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath)
    _nieLogoDataUri = `data:image/png;base64,${buf.toString('base64')}`
  } else {
    _nieLogoDataUri = ''
  }
  return _nieLogoDataUri
}

// ─── Main render function ─────────────────────────────────────────────────────

export function renderLease(data: LeaseTemplateData): string {
  return compileTemplate('lease.html')(buildViewModel(data))
}

// ─── Insurance Acknowledgement renderer ──────────────────────────────────────

export function renderInsuranceAck(data: LeaseTemplateData): string {
  // Reuse the same full view-model — the template only accesses lease, lessor, lessee, signatures
  return compileTemplate('insurance-acknowledgement.html')(buildViewModel(data))
}

// ─── ACH Authorization renderer (All Four, LLC) ──────────────────────────────

export function renderAchAuthorization(data: LeaseTemplateData): string {
  // Inject the logo as a base64 data URI so Puppeteer (setContent, no base URL) can render it
  const vm = { ...buildViewModel(data), logoDataUri: getLogoDataUri() }
  return compileTemplate('ach-authorization.html')(vm)
}

// ─── ACH Authorization renderer (North Iowa Equity, LLC) ─────────────────────

export function renderNieAchAuthorization(data: LeaseTemplateData): string {
  const vm = { ...buildViewModel(data), nieLogoDataUri: getNieLogoDataUri() }
  return compileTemplate('ach-authorization-nie.html')(vm)
}

// ─── Lessor-based ACH selector ────────────────────────────────────────────────
// Returns the correct ACH HTML string based on the lessor name stored in the record.

export function renderAchAuthorizationForLessor(data: LeaseTemplateData): string {
  const lessorName = data.lessor?.name ?? ''
  if (lessorName.toLowerCase().includes('north iowa equity')) {
    return renderNieAchAuthorization(data)
  }
  return renderAchAuthorization(data)
}

