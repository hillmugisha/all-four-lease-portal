/**
 * Typed data contract for the lease HTML template.
 * All monetary values are plain numbers (null = N/A, 0 = $0.00).
 * Dates are ISO 8601 strings (YYYY-MM-DD).
 * The renderer formats everything for display.
 */

// Minimal vehicle summary used in master lease vehicle list
export interface MasterLeaseVehicleEntry {
  id:           number
  vin:          string | null
  model_year:   string | null
  oem:          string | null
  vehicle_line: string | null
  color:        string | null
  body_style?:  string | null
  odometer?:    string | null
}

export interface LeaseTemplateData {
  lease:     LeaseInfo
  lessor:    LessorInfo
  lessee:    LesseeInfo
  vehicle:   VehicleInfo
  financials: FinancialsInfo
  signing:   SigningInfo
  tradein:   TradeInInfo
  cap_items: CapItemsInfo
  optional:  OptionalProductsInfo
  signatures: SignaturesInfo
  ach:       AchTemplateData
  /** Populated only for master lease agreements */
  vehicles?: MasterLeaseVehicleEntry[]
}

export interface LeaseInfo {
  /** ISO date string: "2025-07-10" */
  lease_date: string
  /** Drives [X] checkbox on header */
  is_business_purpose: boolean
}

export interface LessorInfo {
  name:    string
  address: string
  po_box?: string | null
  city:    string
  state:   string
  zip:     string
}

export interface LesseeInfo {
  name:    string
  address: string
  city:    string
  state:   string
  zip:     string
  phone?:  string | null
  email:   string
  /** Primary signer's printed name */
  signer_name: string
  /** Secondary signer (co-lessee), null if none */
  co_signer_name?: string | null
  /** Drives checkbox: "Corporation" | "Partnership" | "LLC" | "Sole Proprietorship" | null (individual) */
  entity_type?: 'Corporation' | 'Partnership' | 'LLC' | 'Sole Proprietorship' | null
  /** Optional business location descriptor */
  location?: string | null
}

export interface VehicleInfo {
  condition:  'NEW' | 'USED'
  year:       string
  make:       string
  model:      string
  body_style?: string | null
  vin:        string
  odometer?:  number | null
}

export interface FinancialsInfo {
  /** Vehicle agreed-upon value (appears in gross cap cost narrative) */
  vehicle_agreed_value: number
  /** = vehicleAgreedValue + taxes + titleRegFees + acquisitionFee + docFee + priorLeaseBalance + optionalProducts */
  gross_cap_cost: number
  /** null = N/A (no reduction), 0 = $0 */
  cap_cost_reduction: number | null
  /** = gross_cap_cost - cap_cost_reduction */
  adjusted_cap_cost: number
  residual_value: number
  /** = adjusted_cap_cost - residual_value */
  depreciation: number
  rent_charge: number
  /** = depreciation + rent_charge */
  total_base_monthly_payments: number
  num_payments: number
  /** = total_base_monthly_payments / num_payments */
  base_monthly_payment: number
  /** null = N/A */
  monthly_sales_tax: number | null
  /** = base_monthly_payment + monthly_sales_tax */
  total_monthly_payment: number
  /** = total_monthly_payment * num_payments */
  total_of_payments: number
  miles_per_year: number
  excess_mileage_rate: number
  /** null = N/A (not yet returned / no charge) */
  disposition_fee: number | null
  early_termination_fee: number | null
  /** = residual_value */
  purchase_option_price: number
  /** 0 = $0.00, null = N/A */
  purchase_option_fee: number | null
  /** Total official fees + taxes over the lease term (shown with "(e)" marker) */
  official_fees_taxes: number
}

export interface SigningInfo {
  /** ISO date: "2025-07-21" */
  first_payment_date: string
  payment_day: number
  /** Total amount due at signing */
  amount_due_at_signing: number
  /** Line items — null = N/A */
  cap_cost_reduction:      number | null
  first_monthly_payment:   number
  security_deposit:        number | null
  reconditioning_reserve:  number | null
  title_fees:              number | null
  registration_fees:       number | null
  other_1_label?:          string | null
  other_1_amount?:         number | null
  other_2_label?:          string | null
  other_2_amount?:         number | null
  /** "How paid" section */
  net_tradein_allowance:   number | null
  rebates_noncash:         number | null
  amount_paid_in_cash:     number | null
}

export interface TradeInInfo {
  has_tradein: boolean
  year?:  string | null
  make?:  string | null
  model?: string | null
  /** null = N/A */
  gross_allowance: number | null
  prior_balance:   number | null
  /** = gross_allowance - prior_balance, min 0 */
  net_allowance:   number
}

export interface CapItemsInfo {
  taxes:                number
  title_reg_fees:       number
  acquisition_fee:      number
  doc_fee:              number
  prior_lease_balance:  number | null
  /** Arbitrary extra line (label+amount), null = N/A */
  other_1_label?:       string | null
  other_1_amount?:      number | null
  /** Optional products — null = N/A */
  mbp_amount:           number | null
  service_contract:     number | null
  gap_amount:           number | null
  optional_other_1_label?:  string | null
  optional_other_1_amount?: number | null
  optional_other_2_label?:  string | null
  optional_other_2_amount?: number | null
}

export interface OptionalProduct {
  amount_or_period?: string | null
  price?:            number | null
  term?:             string | null
  provider?:         string | null
  lessee_initials?:  string | null
}

export interface OptionalProductsInfo {
  mbp: OptionalProduct
  gap: OptionalProduct
}

export interface SignaturesInfo {
  lessee_signer_name:    string
  lessee_signer_title?:  string | null
  co_lessee_signer_name?: string | null
  lessor_name:           string
  lessor_signer_name:    string
  lessor_signer_title:   string
}

export interface AchTemplateData {
  billing_address: string | null
  billing_city:    string | null
  billing_phone:   string | null
  billing_email:   string | null
  bank_name:       string | null
  routing_number:  string | null
  account_number:  string | null
  account_type:    'checking' | 'savings' | null
}
