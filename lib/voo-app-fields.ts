export type VooFieldType = 'text' | 'integer' | 'currency' | 'date' | 'dropdown'

export interface VooAppFieldDef {
  key: string
  label: string       // Excel column header — keep stable; changing breaks existing exports
  type: VooFieldType
  options?: string[]  // required when type === 'dropdown'
  colWidth?: number
}

// The ONLY place to edit when adding a new app-owned field to Vehicles on Order.
// Column widget, export groups, import column reference, import validation,
// vehicle detail modal, and lease schedule pre-population all read from this registry.
export const VOO_APP_FIELDS: VooAppFieldDef[] = [
  // ─── Driver & Vehicle State ───────────────────────────────────────────────
  { key: 'driver',                     label: 'Driver',                      type: 'text',     colWidth: 140 },
  { key: 'ndvr_date',                  label: 'NDVR Date',                   type: 'date',     colWidth: 120 },
  { key: 'odometer',                   label: 'Odometer',                    type: 'integer',  colWidth: 100 },
  { key: 'odometer_date',              label: 'Odometer Date',               type: 'date',     colWidth: 120 },
  { key: 'gps_serial_number',          label: 'GPS Serial Number',           type: 'text',     colWidth: 140 },
  { key: 'plate_number',               label: 'Plate #',                     type: 'text',     colWidth: 110 },
  { key: 'title_state',                label: 'Title State',                 type: 'text',     colWidth: 100 },
  { key: 'registration_date',          label: 'Registration Date',           type: 'date',     colWidth: 140 },
  { key: 'insurance_expiration_date',  label: 'Insurance Expiration Date',   type: 'date',     colWidth: 160 },

  // ─── Lease Terms ─────────────────────────────────────────────────────────
  { key: 'lease_start_date',           label: 'Lease Start Date',            type: 'date',     colWidth: 130 },
  { key: 'term',                       label: 'Term (mo)',                   type: 'integer',  colWidth: 90  },
  { key: 'lease_end_date',             label: 'Lease End Date',              type: 'date',     colWidth: 120 },
  { key: 'net_cap_cost',               label: 'Net Cap Cost',                type: 'currency', colWidth: 120 },
  { key: 'monthly_depreciation',       label: 'Monthly Depreciation',        type: 'currency', colWidth: 150 },
  { key: 'monthly_interest',           label: 'Monthly Interest',            type: 'currency', colWidth: 140 },
  { key: 'monthly_tax',                label: 'Monthly Tax',                 type: 'currency', colWidth: 110 },
  { key: 'monthly_payment',            label: 'Monthly Payment',             type: 'currency', colWidth: 130 },
  { key: 'residual_value',             label: 'Lease End Residual',          type: 'currency', colWidth: 130 },
  { key: 'annual_miles_limit',         label: 'Annual Miles Limit',          type: 'integer',  colWidth: 140 },
  { key: 'lease_end_mile_fee',         label: 'Lease End Mile Fee',          type: 'currency', colWidth: 140 },
  { key: 'tax_type',                   label: 'Tax Type',                    type: 'dropdown', options: ['paid upfront', 'paid monthly', 'exempt'], colWidth: 140 },
  { key: 'tax_paid_upfront',           label: 'Tax Paid Upfront',            type: 'currency', colWidth: 130 },
  { key: 'acquisition_fee',            label: 'Acquisition Fee',             type: 'currency', colWidth: 130 },
  { key: 'disposition_fees',           label: 'Disposition Fees',            type: 'currency', colWidth: 130 },
  { key: 'early_term_fees',            label: 'Early Term Fees',             type: 'currency', colWidth: 130 },
  { key: 'incentive_recognition',      label: 'Incentive Recognition',       type: 'currency', colWidth: 160 },

  // ─── Liability / Funding ─────────────────────────────────────────────────
  { key: 'lender',                     label: 'Lender',                      type: 'text',     colWidth: 130 },
  { key: 'lender_type',                label: 'Lender Type',                 type: 'dropdown', options: ['Loan', 'Lease'], colWidth: 110 },
  { key: 'lender_loan_lease_number',   label: 'Lender Loan / Lease #',       type: 'text',     colWidth: 160 },
  { key: 'liability_start_date',       label: 'Liability Start Date',        type: 'date',     colWidth: 140 },
  { key: 'liability_end_date',         label: 'Liability End Date',          type: 'date',     colWidth: 130 },
  { key: 'liability_term',             label: 'Liability Term',              type: 'integer',  colWidth: 120 },
  { key: 'first_liability_payment_date', label: 'First Liability Payment Date', type: 'date', colWidth: 190 },
  { key: 'funding_amount',             label: 'Funding Amount',              type: 'currency', colWidth: 130 },
  { key: 'monthly_liability_payment',  label: 'Monthly Liability Payment',   type: 'currency', colWidth: 180 },
  { key: 'balloon_payment',            label: 'Balloon Payment',             type: 'currency', colWidth: 130 },
  { key: 'liability_balance',          label: 'Liability Balance',           type: 'currency', colWidth: 140 },

  // ─── Asset Accounting ────────────────────────────────────────────────────
  { key: 'vehicle_acquisition_date',   label: 'Vehicle Acquisition Date',    type: 'date',     colWidth: 170 },
  { key: 'monthly_depreciation_sl',    label: 'Monthly Depreciation (SL)',   type: 'currency', colWidth: 170 },
  { key: 'net_book_value',             label: 'Net Book Value',              type: 'currency', colWidth: 130 },
  { key: 'monthly_cash_flow',          label: 'Monthly Cash Flow',           type: 'currency', colWidth: 140 },
  { key: 'mmr',                        label: 'MMR',                         type: 'currency', colWidth: 100 },
  { key: 'net_sale_price',             label: 'Net Sale Price',              type: 'currency', colWidth: 120 },
  // Add new fields here — no other code changes needed
]

// Fields in app_data that map directly to existing columns in the leases table.
// Used at lease activation to pre-populate the corresponding lease record fields.
export const VOO_TO_LEASE_COLUMN_MAP: Record<string, string> = {
  lease_start_date:   'first_payment_date',
  term:               'num_payments',
  monthly_tax:        'monthly_sales_tax',
  residual_value:     'residual_value',
  annual_miles_limit: 'miles_per_year',
  lease_end_mile_fee: 'excess_mileage_rate',
  disposition_fees:   'disposition_fee',
  early_term_fees:    'early_termination_fee',
  acquisition_fee:    'acquisition_fee',
}
