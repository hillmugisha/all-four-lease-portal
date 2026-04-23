export interface LeasePortfolioRecord {
  id: string
  created_at: string
  updated_at?: string

  // ── Status ───────────────────────────────────────────────────────────────
  lease_status: string

  // ── Onboarding ────────────────────────────────────────────────────────────
  onboard_type: string | null

  // ── Customer ──────────────────────────────────────────────────────────────
  customer_type: string | null
  company_name: string | null
  customer_name: string | null
  driver: string | null
  location: string | null
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip_code: string | null
  phone: string | null
  email_address: string | null

  // ── Vehicle ───────────────────────────────────────────────────────────────
  model_year: string | null
  make: string | null
  model: string | null
  color: string | null
  vin: string | null
  comments: string | null
  gps_serial_number: string | null
  vehicle_acquisition_date: string | null

  // ── Odometer ──────────────────────────────────────────────────────────────
  odometer: number | null
  odometer_date: string | null
  odometer_at_time_of_sale: number | null

  // ── Dates / Delivery ──────────────────────────────────────────────────────
  ndvr_date: string | null
  lease_start_date: string | null
  term: string | null
  lease_end_date: string | null
  out_of_service_date: string | null
  sold_date: string | null
  disposal_date: string | null
  insurance_expiration_date: string | null
  first_liability_payment_date: string | null

  // ── Lease Terms ───────────────────────────────────────────────────────────
  annual_miles_limit: number | null
  lease_end_mile_fee: number | null
  title_state: string | null
  registration_date: string | null
  plate_number: string | null
  tax_type: string | null

  // ── Financials (Customer-Facing) ──────────────────────────────────────────
  net_cap_cost: number | null
  monthly_depreciation: number | null
  monthly_interest: number | null
  monthly_tax: string | null
  monthly_payment: number | null
  lease_end_residual: number | null
  tax_paid_upfront: number | null
  acquisition_fee: number | null
  incentive_recognition: string | null
  monthly_cash_flow: number | null

  // ── Disposition (Sold-specific) ───────────────────────────────────────────
  net_sale_price: number | null
  mmr: number | null
  days_to_sell: number | null
  disposition_fees: number | null
  early_term_fees: number | null

  // ── Lender / Financing ────────────────────────────────────────────────────
  lender: string | null
  lender_loan_lease_number: string | null
  liability_start_date: string | null
  liability_end_date: string | null
  funding_amount: number | null
  monthly_liability_payment: number | null
  balloon_payment: number | null
  monthly_depreciation_sl: number | null
  lender_interest_rate: number | null
  lender_term: string | null
  liability_balance: number | null
  net_book_value: number | null

  // ── Portal link ───────────────────────────────────────────────────────────
  portal_lease_id?: string | null

  // ── Archive ───────────────────────────────────────────────────────────────
  archived?: boolean | null
}
