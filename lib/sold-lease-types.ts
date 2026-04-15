export interface SoldLeaseRecord {
  id: string
  created_at: string

  // ── Sale & Disposal ───────────────────────────────────────────────────────────
  sold_date: string | null
  disposal_date: string | null
  wholesale_proceeds: number | null
  mmr_net_sale_price: number | null

  // ── Customer & Contact ───────────────────────────────────────────────────────
  company: string | null
  customer_type: string | null
  customer_name: string | null
  location_driver: string | null
  payment_method: string | null
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip_code: string | null
  phone: string | null
  email_address: string | null

  // ── Vehicle ──────────────────────────────────────────────────────────────────
  year: string | null
  make: string | null
  model: string | null
  color: string | null
  vin: string | null
  vin8: string | null
  sold_odometer: number | null
  odometer_date: string | null
  plate_number: string | null
  comments: string | null

  // ── Lease Terms ──────────────────────────────────────────────────────────────
  ndvr_date: string | null
  lease_start_date: string | null
  term: string | null
  lease_end_date: string | null
  annual_miles: number | null
  lease_end_mile_fee: number | null
  ttl_state: string | null
  ttl_mo: number | null
  upfront_tax_paid: number | null

  // ── Financials (Customer-Facing) ─────────────────────────────────────────────
  net_cap_cost: number | null
  mon_dep: number | null
  mon_payment: number | null
  residual_resale_quote: number | null

  // ── Lender / Financing ───────────────────────────────────────────────────────
  lender_lessor: string | null
  loan_lease_number: string | null
  loan_lease_start_date: string | null
  loan_lease_end_date: string | null
  monthly_payment: number | null
  lender_net_cap_cost: number | null
  balloon_residual: number | null
  monthly_depreciation_lender: number | null
  lender_int_rate_pct: number | null
}
