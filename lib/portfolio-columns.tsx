import React from 'react'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'
import { fmtDate, fmtMoney, fmtMoneyOrText } from '@/lib/table-utils'

// ─── Shared column key type ────────────────────────────────────────────────────

export type ColKey =
  // Identity
  | 'lease_id' | 'mla_flag'
  // Sale & Disposition
  | 'sold_date' | 'disposal_date' | 'net_sale_price' | 'mmr' | 'days_to_sell'
  | 'disposition_fees' | 'early_term_fees'
  // Revenue (computed)
  | 'gross_revenue' | 'net_revenue'
  // Status / Onboarding / Classification
  | 'lease_status' | 'onboard_type' | 'contract_structure' | 'lease_type'
  // Customer
  | 'company_name' | 'customer_name' | 'customer_type'
  | 'driver' | 'location' | 'phone' | 'email_address'
  // Billing
  | 'billing_address' | 'billing_city' | 'billing_state' | 'billing_zip_code'
  // Vehicle
  | 'model_year' | 'make' | 'model' | 'color' | 'vin'
  | 'comments' | 'gps_serial_number' | 'vehicle_acquisition_date' | 'vehicle_use_type'
  // Odometer
  | 'odometer_at_time_of_sale' | 'odometer' | 'odometer_date'
  // Dates
  | 'lease_start_date' | 'lease_end_date' | 'term' | 'ndvr_date'
  | 'out_of_service_date' | 'insurance_expiration_date' | 'first_liability_payment_date'
  // Lease Terms
  | 'annual_miles_limit' | 'lease_end_mile_fee' | 'title_state'
  | 'registration_date' | 'plate_number' | 'tax_type'
  // Financials (Customer)
  | 'net_cap_cost' | 'monthly_depreciation' | 'monthly_interest' | 'monthly_tax'
  | 'monthly_payment' | 'lease_end_residual' | 'tax_paid_upfront'
  | 'acquisition_fee' | 'incentive_recognition' | 'monthly_cash_flow'
  // Lender / Financing
  | 'lender' | 'lender_loan_lease_number' | 'liability_start_date' | 'liability_end_date'
  | 'liability_term'
  | 'funding_amount' | 'monthly_liability_payment' | 'balloon_payment'
  | 'monthly_depreciation_sl' | 'lender_interest_rate' | 'lender_term' | 'lender_type'
  | 'liability_balance' | 'net_book_value'

export interface ColDef {
  key:      ColKey
  label:    string
  width:    number
  tooltip?: string
}

// ─── Master column list (all pritchard_lease_portfolio fields) ─────────────────

const GROSS_FORMULA = 'Gross Revenue = (Monthly Payment × Term) + Net Sale Price'
const NET_FORMULA   = 'Net Revenue = Gross Revenue − (Lender Monthly Payment × Term) − Balloon Payment'

export const COLUMNS: ColDef[] = [
  // ── Identity ──
  { key: 'lease_id',  label: 'Lease ID',  width: 150, tooltip: 'Stable internal ID assigned at activation (e.g. A4-2026-000047)' },
  { key: 'mla_flag', label: 'MLA_Flag',   width:  80, tooltip: 'Y = vehicle is on a Master Lease Agreement; N = standalone' },
  // ── Sale & Disposition ──
  { key: 'sold_date',                    label: 'Sold Date',                  width: 120 },
  { key: 'disposal_date',                label: 'Disposal Date',              width: 130 },
  { key: 'net_sale_price',               label: 'Net Sale Price',             width: 140 },
  { key: 'mmr',                          label: 'MMR',                        width: 120 },
  { key: 'days_to_sell',                 label: 'Days to Sell',               width: 110 },
  { key: 'disposition_fees',             label: 'Disposition Fees',           width: 140 },
  { key: 'early_term_fees',              label: 'Early Term Fees',            width: 130 },
  // ── Revenue (computed) ──
  { key: 'gross_revenue',                label: 'Gross Revenue',              width: 145, tooltip: GROSS_FORMULA },
  { key: 'net_revenue',                  label: 'Net Revenue',                width: 135, tooltip: NET_FORMULA },
  // ── Status / Onboarding / Classification ──
  { key: 'lease_status',                 label: 'Lease Status',               width: 120 },
  { key: 'onboard_type',                 label: 'Onboard Type',               width: 130 },
  { key: 'contract_structure',           label: 'Contract Structure',         width: 180, tooltip: 'Closed-End Lease | TRAC / Open-End Lease | Rental / Short Term' },
  { key: 'lease_type',                   label: 'Lease Type',                 width: 160, tooltip: 'Core | Daily Rental | All Four Rental | Lakelife Rental' },
  // ── Customer ──
  { key: 'company_name',                 label: 'Company',                    width: 150 },
  { key: 'customer_name',                label: 'Customer Name',              width: 170 },
  { key: 'customer_type',                label: 'Customer Type',              width: 130 },
  { key: 'driver',                       label: 'Driver',                     width: 150 },
  { key: 'location',                     label: 'Location',                   width: 150 },
  { key: 'phone',                        label: 'Phone',                      width: 130 },
  { key: 'email_address',                label: 'Email',                      width: 180 },
  // ── Billing ──
  { key: 'billing_address',              label: 'Billing Address',            width: 200 },
  { key: 'billing_city',                 label: 'Billing City',               width: 130 },
  { key: 'billing_state',                label: 'Billing State',              width: 110 },
  { key: 'billing_zip_code',             label: 'Billing ZIP',                width: 100 },
  // ── Vehicle ──
  { key: 'model_year',                   label: 'Year',                       width:  80 },
  { key: 'make',                         label: 'Make',                       width: 100 },
  { key: 'model',                        label: 'Model',                      width: 120 },
  { key: 'color',                        label: 'Color',                      width: 110 },
  { key: 'vin',                          label: 'VIN',                        width: 155 },
  { key: 'comments',                     label: 'Comments',                   width: 180 },
  { key: 'gps_serial_number',            label: 'GPS Serial #',               width: 130 },
  { key: 'vehicle_acquisition_date',     label: 'Vehicle Acquisition Date',   width: 180 },
  { key: 'vehicle_use_type',             label: 'Vehicle Use Type',           width: 180, tooltip: 'Standard Customer Use | Company Demo | Company Vehicle | Service/Loaner | Rental Use' },
  // ── Odometer ──
  { key: 'odometer_at_time_of_sale',     label: 'Sold Odometer',              width: 130 },
  { key: 'odometer',                     label: 'Odometer',                   width: 120 },
  { key: 'odometer_date',                label: 'Odometer Date',              width: 130 },
  // ── Dates ──
  { key: 'lease_start_date',             label: 'Lease Start',                width: 120 },
  { key: 'lease_end_date',               label: 'Lease End',                  width: 120 },
  { key: 'term',                         label: 'Term (mo.)',                  width:  90 },
  { key: 'ndvr_date',                    label: 'NDVR Date',                  width: 120 },
  { key: 'out_of_service_date',          label: 'Out of Service Date',        width: 160 },
  { key: 'insurance_expiration_date',    label: 'Insurance Exp. Date',        width: 160 },
  { key: 'first_liability_payment_date', label: 'First Liability Pmt. Date',  width: 180 },
  // ── Lease Terms ──
  { key: 'annual_miles_limit',           label: 'Annual Miles',               width: 120 },
  { key: 'lease_end_mile_fee',           label: 'Lease End Mile Fee',         width: 150 },
  { key: 'title_state',                  label: 'Title State',                width: 100 },
  { key: 'registration_date',            label: 'Registration Date',          width: 150 },
  { key: 'plate_number',                 label: 'Plate #',                    width: 100 },
  { key: 'tax_type',                     label: 'Tax Type',                   width: 100 },
  // ── Financials (Customer) ──
  { key: 'net_cap_cost',                 label: 'Net Cap Cost',               width: 130 },
  { key: 'monthly_depreciation',         label: 'Mon. Depreciation',          width: 140 },
  { key: 'monthly_interest',             label: 'Mon. Interest',              width: 130 },
  { key: 'monthly_tax',                  label: 'Mon. Tax',                   width: 120 },
  { key: 'monthly_payment',              label: 'Mon. Payment',               width: 120 },
  { key: 'lease_end_residual',           label: 'Lease End Residual',         width: 150 },
  { key: 'tax_paid_upfront',             label: 'Tax Paid Upfront',           width: 140 },
  { key: 'acquisition_fee',              label: 'Acquisition Fee',            width: 140 },
  { key: 'incentive_recognition',        label: 'Incentive Recognition',      width: 170 },
  { key: 'monthly_cash_flow',            label: 'Mon. Cash Flow',             width: 130 },
  // ── Lender / Financing ──
  { key: 'lender',                       label: 'Lender',                     width: 170 },
  { key: 'lender_loan_lease_number',     label: 'Loan/Lease #',               width: 130 },
  { key: 'liability_start_date',         label: 'Liability Start',            width: 130 },
  { key: 'liability_end_date',           label: 'Liability End',              width: 130 },
  { key: 'liability_term',               label: 'Liability Term',             width: 130, tooltip: 'Calculated: months from Liability Start to Liability End' },
  { key: 'funding_amount',               label: 'Funding Amount',             width: 140 },
  { key: 'monthly_liability_payment',    label: 'Monthly Liability Pmt.',     width: 170 },
  { key: 'balloon_payment',              label: 'Balloon Payment',            width: 140 },
  { key: 'monthly_depreciation_sl',      label: 'Mon. Dep. (SL)',             width: 130 },
  { key: 'lender_interest_rate',         label: 'Lender Int. Rate',           width: 140 },
  { key: 'lender_term',                  label: 'Lender Term',                width: 120 },
  { key: 'lender_type',                  label: 'Lender Type',                width: 110, tooltip: 'Loan | Lease' },
  { key: 'liability_balance',            label: 'Liability Balance',          width: 140 },
  { key: 'net_book_value',               label: 'Net Book Value',             width: 130 },
]

// ─── Default widths (keyed by ColKey) ─────────────────────────────────────────

export const DEFAULT_WIDTHS: Record<ColKey, number> = Object.fromEntries(
  COLUMNS.map((c) => [c.key, c.width])
) as Record<ColKey, number>

// ─── Cell title for native tooltip (returns raw string value when available) ──

export function getCellTitle(key: ColKey, lease: LeasePortfolioRecord): string | undefined {
  const raw = (lease as unknown as Record<string, unknown>)[key]
  return typeof raw === 'string' && raw ? raw : undefined
}

// ─── Per-tab default visible columns ──────────────────────────────────────────

export const DEFAULT_COLS_ACTIVE: ColKey[] = [
  'lease_id', 'mla_flag',
  'lease_status', 'company_name', 'customer_name',
  'monthly_depreciation', 'monthly_interest', 'monthly_tax',
  'vin', 'customer_type', 'onboard_type',
  'lease_start_date', 'lease_end_date', 'monthly_payment', 'lender',
]

export const DEFAULT_COLS_EXPIRED: ColKey[] = [
  'lease_id', 'mla_flag',
  'out_of_service_date', 'company_name', 'customer_name',
  'model_year', 'make', 'model', 'vin', 'customer_type',
  'lease_start_date', 'lease_end_date', 'monthly_payment', 'lender',
]

export const DEFAULT_COLS_PURCHASED: ColKey[] = [
  'lease_id', 'mla_flag',
  'sold_date', 'disposal_date', 'net_sale_price', 'gross_revenue', 'net_revenue',
  'company_name', 'customer_name', 'customer_type',
  'model_year', 'make', 'model', 'vin', 'lender',
]

// ─── Revenue calculation ───────────────────────────────────────────────────────

export function calcRevenue(lease: LeasePortfolioRecord): { gross: number; net: number } | null {
  const term = parseFloat(String(lease.term ?? ''))
  if (
    lease.monthly_payment           == null ||
    lease.monthly_liability_payment == null ||
    lease.balloon_payment           == null ||
    isNaN(term)
  ) return null
  const gross = lease.monthly_payment * term + (lease.net_sale_price ?? 0)
  const net   = gross - lease.monthly_liability_payment * term - lease.balloon_payment
  return { gross, net }
}

// ─── Shared cell renderer ─────────────────────────────────────────────────────

export const STATUS_STYLES: Record<string, string> = {
  Active:            'bg-green-50 text-green-700',
  Expired:           'bg-red-50 text-red-700',
  'Out of Service':  'bg-red-50 text-red-700',
  Terminated:        'bg-red-50 text-red-700',
  Purchased:         'bg-blue-50 text-blue-700',
  Sold:              'bg-blue-50 text-blue-700',
}

const XS    = 'text-xs text-gray-700'
const TRUNC = 'truncate text-xs text-gray-700'
const MONEY = 'whitespace-nowrap text-xs text-gray-800'

export function buildCell(key: ColKey, lease: LeasePortfolioRecord): React.ReactNode {
  switch (key) {
    // ── Identity ──
    case 'lease_id':
      return lease.lease_id
        ? <span className="font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">{lease.lease_id}</span>
        : <span className="text-xs text-gray-400">—</span>
    case 'mla_flag':
      return lease.mla_flag
        ? <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-purple-100 text-purple-700">Y</span>
        : <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">N</span>

    // ── Sale & Disposition ──
    case 'sold_date':
      return <span className="whitespace-nowrap text-xs font-medium text-blue-700">{fmtDate(lease.sold_date)}</span>
    case 'disposal_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.disposal_date)}</span>
    case 'net_sale_price':
      return <span className="whitespace-nowrap font-medium text-gray-900">{fmtMoney(lease.net_sale_price)}</span>
    case 'mmr':
      return <span className={MONEY}>{fmtMoney(lease.mmr)}</span>
    case 'days_to_sell':
      return <span className={XS}>{lease.days_to_sell ?? '—'}</span>
    case 'disposition_fees':
      return <span className={MONEY}>{fmtMoney(lease.disposition_fees)}</span>
    case 'early_term_fees':
      return <span className={MONEY}>{fmtMoney(lease.early_term_fees)}</span>

    // ── Revenue (computed) ──
    case 'gross_revenue': {
      const rev = calcRevenue(lease)
      return <span className="whitespace-nowrap font-medium text-indigo-700">{fmtMoney(rev?.gross)}</span>
    }
    case 'net_revenue': {
      const rev = calcRevenue(lease)
      return <span className="whitespace-nowrap font-medium text-emerald-700">{fmtMoney(rev?.net)}</span>
    }

    // ── Status / Onboarding ──
    case 'lease_status': {
      const display = lease.lease_status === 'Purchased' ? 'Sold' : lease.lease_status
      const color = STATUS_STYLES[display] ?? 'bg-gray-100 text-gray-600'
      return (
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
          {display}
        </span>
      )
    }
    case 'onboard_type':
      return <div className={TRUNC}>{lease.onboard_type ?? '—'}</div>
    case 'contract_structure':
      return <div className={TRUNC}>{lease.contract_structure ?? '—'}</div>
    case 'lease_type':
      return <div className={TRUNC}>{lease.lease_type ?? '—'}</div>

    // ── Customer ──
    case 'company_name':
      return <div className="truncate text-gray-800">{lease.company_name ?? '—'}</div>
    case 'customer_name':
      return <div className="font-medium text-gray-900 truncate">{lease.customer_name ?? '—'}</div>
    case 'customer_type':
      return <div className={TRUNC}>{lease.customer_type ?? '—'}</div>
    case 'driver':
      return <div className={TRUNC}>{lease.driver ?? '—'}</div>
    case 'location':
      return <div className={TRUNC}>{lease.location ?? '—'}</div>
    case 'phone':
      return <span className={XS}>{lease.phone ?? '—'}</span>
    case 'email_address':
      return <span className={TRUNC}>{lease.email_address ?? '—'}</span>

    // ── Billing ──
    case 'billing_address':
      return <div className={TRUNC}>{lease.billing_address ?? '—'}</div>
    case 'billing_city':
      return <span className={XS}>{lease.billing_city ?? '—'}</span>
    case 'billing_state':
      return <span className={XS}>{lease.billing_state ?? '—'}</span>
    case 'billing_zip_code':
      return <span className={XS}>{lease.billing_zip_code ?? '—'}</span>

    // ── Vehicle ──
    case 'model_year':
      return <span className={XS}>{lease.model_year ?? '—'}</span>
    case 'make':
      return <span className={XS}>{lease.make ?? '—'}</span>
    case 'model':
      return <div className={TRUNC}>{lease.model ?? '—'}</div>
    case 'color':
      return <div className={TRUNC}>{lease.color ?? '—'}</div>
    case 'vin':
      return <span className="truncate block font-mono text-xs text-gray-600">{lease.vin ?? '—'}</span>
    case 'comments':
      return <div className={TRUNC}>{lease.comments ?? '—'}</div>
    case 'gps_serial_number':
      return <span className={XS}>{lease.gps_serial_number ?? '—'}</span>
    case 'vehicle_acquisition_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.vehicle_acquisition_date)}</span>
    case 'vehicle_use_type':
      return <div className={TRUNC}>{lease.vehicle_use_type ?? '—'}</div>

    // ── Odometer ──
    case 'odometer_at_time_of_sale':
      return <span className={XS}>{lease.odometer_at_time_of_sale != null ? Number(lease.odometer_at_time_of_sale).toLocaleString() : '—'}</span>
    case 'odometer':
      return <span className={XS}>{lease.odometer != null ? Number(lease.odometer).toLocaleString() : '—'}</span>
    case 'odometer_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.odometer_date)}</span>

    // ── Dates ──
    case 'lease_start_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.lease_start_date)}</span>
    case 'lease_end_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.lease_end_date)}</span>
    case 'term':
      return <span className={XS}>{lease.term != null ? `${lease.term} mo` : '—'}</span>
    case 'ndvr_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.ndvr_date)}</span>
    case 'out_of_service_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.out_of_service_date)}</span>
    case 'insurance_expiration_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.insurance_expiration_date)}</span>
    case 'first_liability_payment_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.first_liability_payment_date)}</span>

    // ── Lease Terms ──
    case 'annual_miles_limit':
      return <span className={XS}>{lease.annual_miles_limit != null ? Number(lease.annual_miles_limit).toLocaleString() : '—'}</span>
    case 'lease_end_mile_fee':
      return <span className={XS}>{lease.lease_end_mile_fee != null ? `$${lease.lease_end_mile_fee}/mi` : '—'}</span>
    case 'title_state':
      return <span className={XS}>{lease.title_state ?? '—'}</span>
    case 'registration_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.registration_date)}</span>
    case 'plate_number':
      return <span className={XS}>{lease.plate_number ?? '—'}</span>
    case 'tax_type':
      return <span className={XS}>{lease.tax_type ?? '—'}</span>

    // ── Financials (Customer) ──
    case 'net_cap_cost':
      return <span className={MONEY}>{fmtMoney(lease.net_cap_cost)}</span>
    case 'monthly_depreciation':
      return <span className={MONEY}>{fmtMoney(lease.monthly_depreciation)}</span>
    case 'monthly_interest':
      return <span className={MONEY}>{fmtMoney(lease.monthly_interest)}</span>
    case 'monthly_tax':
      return <span className={MONEY}>{fmtMoneyOrText(lease.monthly_tax)}</span>
    case 'monthly_payment':
      return <span className="whitespace-nowrap font-medium text-gray-900">{fmtMoney(lease.monthly_payment)}</span>
    case 'lease_end_residual':
      return <span className={MONEY}>{fmtMoney(lease.lease_end_residual)}</span>
    case 'tax_paid_upfront':
      return <span className={MONEY}>{fmtMoney(lease.tax_paid_upfront)}</span>
    case 'acquisition_fee':
      return <span className={MONEY}>{fmtMoney(lease.acquisition_fee)}</span>
    case 'incentive_recognition':
      return <div className={TRUNC}>{lease.incentive_recognition ?? '—'}</div>
    case 'monthly_cash_flow':
      return <span className={MONEY}>{fmtMoney(lease.monthly_cash_flow)}</span>

    // ── Lender / Financing ──
    case 'lender':
      return <span className="truncate block text-xs text-gray-600">{lease.lender ?? '—'}</span>
    case 'lender_loan_lease_number':
      return <span className="text-xs font-mono text-gray-600">{lease.lender_loan_lease_number ?? '—'}</span>
    case 'liability_start_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.liability_start_date)}</span>
    case 'liability_end_date':
      return <span className="whitespace-nowrap text-xs text-gray-600">{fmtDate(lease.liability_end_date)}</span>
    case 'liability_term': {
      const start = lease.liability_start_date ? new Date(lease.liability_start_date) : null
      const end   = lease.liability_end_date   ? new Date(lease.liability_end_date)   : null
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
        return <span className={XS}>—</span>
      }
      const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
      return <span className={XS}>{months > 0 ? `${months} mo` : '—'}</span>
    }
    case 'funding_amount':
      return <span className={MONEY}>{fmtMoney(lease.funding_amount)}</span>
    case 'monthly_liability_payment':
      return <span className={MONEY}>{fmtMoney(lease.monthly_liability_payment)}</span>
    case 'balloon_payment':
      return <span className={MONEY}>{fmtMoney(lease.balloon_payment)}</span>
    case 'monthly_depreciation_sl':
      return <span className={MONEY}>{fmtMoney(lease.monthly_depreciation_sl)}</span>
    case 'lender_interest_rate':
      return <span className={XS}>{lease.lender_interest_rate != null ? `${(Number(lease.lender_interest_rate) * 100).toFixed(3)}%` : '—'}</span>
    case 'lender_term':
      return <span className={XS}>{lease.lender_term ?? '—'}</span>
    case 'lender_type':
      return <div className={TRUNC}>{lease.lender_type ?? '—'}</div>
    case 'liability_balance':
      return <span className={MONEY}>{fmtMoney(lease.liability_balance)}</span>
    case 'net_book_value':
      return <span className={MONEY}>{fmtMoney(lease.net_book_value)}</span>

    default:
      return <span className="text-xs text-gray-400">—</span>
  }
}
