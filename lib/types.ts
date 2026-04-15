// ─── Lease form data (what the sales person fills in) ────────────────────────

export interface LessorInfo {
  lessorName: string
  lessorAddress: string
  lessorPoBox: string
  lessorCity: string
  lessorState: string
  lessorZip: string
}

export interface LesseeInfo {
  // Lease classification (required before preview/send)
  leaseType: string
  customerType: string
  vehicleUse: string
  department?: string       // only when customerType = 'Internal'
  departmentOther?: string  // only when department = 'Other'

  lesseeName: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

export interface VehicleInfo {
  condition: 'NEW' | 'USED'
  year: string
  make: string
  model: string
  bodyStyle: string
  vin: string
  odometer: string
}

export interface FinancialInputs {
  leaseDate: string            // ISO date string YYYY-MM-DD
  numPayments: number          // lease term in months
  firstPaymentDate: string     // ISO date string
  paymentDay: number           // day of month for recurring payments

  // Gross cap cost build-up
  vehicleAgreedValue: number
  taxes: number
  titleRegFees: number
  acquisitionFee: number
  docFee: number
  priorLeaseBalance: number
  optionalProducts: number     // MBP / service contract / gap combined

  // Reductions
  capCostReduction: number     // trade-in net + rebates + cash down

  // Deal economics
  residualValue: number
  rentCharge: number
  monthlySalesTax: number

  // Mileage
  milesPerYear: number
  excessMileageRate: number

  // Fees
  dispositionFee: number
  earlyTerminationFee: number
  purchaseOptionFee: number

  // Trade-in (optional)
  tradeinYear: string
  tradeinMake: string
  tradeinModel: string
  tradeinGrossAllowance: number
  tradeinPriorBalance: number

  // DocuSign (Phase 2 – added here so the type is complete)
  customerSignerName: string
  customerSignerEmail: string
}

export interface SignatoryEntry {
  firstName: string
  lastName: string
  email: string
}

export interface SignaturesInfo {
  lesseeSignatories: SignatoryEntry[]
  lessorSignatoryName: string
  lessorSignatoryEmail: string
  lessorSignatoryTitle: string
}

// All steps combined into one lease record
export type LeaseFormData = LessorInfo & LesseeInfo & VehicleInfo & FinancialInputs & SignaturesInfo

// ─── Calculated fields (derived from FinancialInputs) ────────────────────────

export interface CalculatedFields {
  grossCapCost: number
  netTradeinAllowance: number
  adjustedCapCost: number
  depreciation: number
  totalBaseMonthlyPayments: number
  baseMonthlyPayment: number
  totalMonthlyPayment: number
  totalOfPayments: number
  amountDueAtSigning: number
  officialFeesTaxes: number
}

// ─── Database record (Supabase row) ──────────────────────────────────────────

export type LeaseStatus = 'draft' | 'sent' | 'customer_signed' | 'completed' | 'generated'

export interface LeaseRecord {
  id: string
  created_at: string
  updated_at: string
  doc_status: LeaseStatus

  // Lessor
  lessor_name: string
  lessor_address: string
  lessor_po_box: string | null
  lessor_city: string
  lessor_state: string
  lessor_zip: string

  // Lessee
  lessee_name: string
  lessee_address: string
  lessee_city: string
  lessee_state: string
  lessee_zip: string
  lessee_phone: string | null
  lessee_email: string

  // Lease
  lease_date: string

  // Vehicle
  vehicle_condition: 'NEW' | 'USED'
  vehicle_year: string
  vehicle_make: string
  vehicle_model: string
  vehicle_body_style: string
  vehicle_vin: string
  vehicle_odometer: string | null

  // Financial inputs
  vehicle_agreed_value: number
  taxes: number
  title_reg_fees: number
  acquisition_fee: number
  doc_fee: number
  prior_lease_balance: number
  optional_products: number
  cap_cost_reduction: number
  residual_value: number
  rent_charge: number
  num_payments: number
  monthly_sales_tax: number
  first_payment_date: string
  payment_day: number
  miles_per_year: number
  excess_mileage_rate: number
  disposition_fee: number
  early_termination_fee: number
  purchase_option_fee: number

  // Trade-in
  tradein_year: string | null
  tradein_make: string | null
  tradein_model: string | null
  tradein_gross_allowance: number
  tradein_prior_balance: number

  // Calculated (stored for audit trail)
  gross_cap_cost: number
  net_tradein_allowance: number
  adjusted_cap_cost: number
  depreciation: number
  total_base_monthly_payments: number
  base_monthly_payment: number
  total_monthly_payment: number
  total_of_payments: number
  amount_due_at_signing: number
  official_fees_taxes: number

  // Signer / DocuSign fields — these columns exist in the DB (add via SQL if missing).
  lessor_signer_title?:   string | null
  customer_signer_name?:  string | null
  customer_signer_email?: string | null
  co_lessee_signer_name?: string | null  // in-memory only, never inserted
  lessor_signer_name?:    string | null
  docusign_envelope_id?:  string | null
  signed_at?:             string | null

  // Activation — set when a completed lease is promoted to Current Leases
  is_active?:    boolean | null
  activated_at?: string  | null
}
