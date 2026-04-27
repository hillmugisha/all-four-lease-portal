-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Collapse current_lease_info + expired_leases + sold_leases
--            into a single pritchard_lease_portfolio table.
--
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Run Steps A → D in order. Verify row counts after Step B before Step D.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Step A: Create the unified table ────────────────────────────────────────

create table if not exists pritchard_lease_portfolio (
  id                            uuid          default gen_random_uuid() primary key,
  created_at                    timestamptz   default now(),
  updated_at                    timestamptz   default now(),

  -- ── Status (discriminator — replaces table-per-status pattern) ────────────
  lease_status                  text          not null default 'Active'
                                check (lease_status in ('Active', 'Expired', 'Terminated', 'Purchased')),
  onboard_type                  text,

  -- ── Customer ──────────────────────────────────────────────────────────────
  customer_type                 text,
  company_name                  text,
  customer_name                 text,
  driver                        text,
  location                      text,
  billing_address               text,
  billing_city                  text,
  billing_state                 text,
  billing_zip_code              text,
  phone                         text,
  email_address                 text,

  -- ── Vehicle ───────────────────────────────────────────────────────────────
  model_year                    text,
  make                          text,
  model                         text,
  color                         text,
  vin                           text,
  comments                      text,
  gps_serial_number             text,
  vehicle_acquisition_date      text,

  -- ── Odometer ──────────────────────────────────────────────────────────────
  odometer                      numeric(12,2),
  odometer_date                 text,
  odometer_at_time_of_sale      numeric(12,2),

  -- ── Dates / Delivery ──────────────────────────────────────────────────────
  ndvr_date                     text,
  lease_start_date              text,
  term                          text,
  lease_end_date                text,
  out_of_service_date           text,
  sold_date                     text,
  disposal_date                 text,
  insurance_expiration_date     text,
  first_liability_payment_date  text,

  -- ── Lease Terms ───────────────────────────────────────────────────────────
  annual_miles_limit            numeric(12,2),
  lease_end_mile_fee            numeric(12,6),
  title_state                   text,
  registration_date             text,
  plate_number                  text,
  tax_type                      text,

  -- ── Financials (Customer-Facing) ──────────────────────────────────────────
  net_cap_cost                  numeric(12,2),
  monthly_depreciation          numeric(12,2),
  monthly_interest              numeric(12,2),
  monthly_tax                   text,
  monthly_payment               numeric(12,2),
  lease_end_residual            numeric(12,2),
  tax_paid_upfront              numeric(12,2),
  acquisition_fee               numeric(12,2),
  incentive_recognition         text,
  monthly_cash_flow             numeric(12,2),

  -- ── Disposition (Sold-specific) ───────────────────────────────────────────
  net_sale_price                numeric(12,2),
  mmr                           numeric(12,2),
  days_to_sell                  integer,
  disposition_fees              numeric(12,2),
  early_term_fees               numeric(12,2),

  -- ── Lender / Financing ────────────────────────────────────────────────────
  lender                        text,
  lender_loan_lease_number      text,
  liability_start_date          text,
  liability_end_date            text,
  funding_amount                numeric(12,2),
  monthly_liability_payment     numeric(12,2),
  balloon_payment               numeric(12,2),
  monthly_depreciation_sl       numeric(12,2),
  lender_interest_rate          numeric(10,6),
  lender_term                   text,
  liability_balance             numeric(12,2),
  net_book_value                numeric(12,2),

  -- ── Classification (added via migration_add_classification_fields.sql) ────
  contract_structure            text,   -- Closed-End Lease | TRAC / Open-End Lease | Rental / Short Term
  lease_type                    text,   -- Core | Daily Rental | All Four Rental | Lakelife Rental
  vehicle_use_type              text,   -- Standard Customer Use | Company Demo | Company Vehicle | Service/Loaner | Rental Use
  lender_type                   text,   -- Loan | Lease

  -- ── Portal link ───────────────────────────────────────────────────────────
  portal_lease_id               uuid
);

-- Auto-update updated_at
create trigger pritchard_lease_portfolio_updated_at
  before update on pritchard_lease_portfolio
  for each row execute function update_updated_at();

-- RLS (open — matches existing tables)
alter table pritchard_lease_portfolio enable row level security;
drop policy if exists "Allow all for pritchard_lease_portfolio" on pritchard_lease_portfolio;
create policy "Allow all for pritchard_lease_portfolio" on pritchard_lease_portfolio
  for all using (true) with check (true);


-- ─── Step B: Migrate data from the three old tables ──────────────────────────

-- From current_lease_info
insert into pritchard_lease_portfolio (
  created_at, lease_status, onboard_type,
  customer_type, company_name, customer_name, driver,
  billing_address, billing_city, billing_state, billing_zip_code, phone, email_address,
  model_year, make, model, color, vin,
  odometer, odometer_date, ndvr_date,
  lease_start_date, term, lease_end_date,
  net_cap_cost, monthly_depreciation, monthly_interest, monthly_tax, monthly_payment,
  lease_end_residual, annual_miles_limit, lease_end_mile_fee,
  title_state, registration_date, plate_number, insurance_expiration_date,
  tax_paid_upfront, lender, lender_loan_lease_number,
  liability_start_date, liability_end_date, funding_amount,
  monthly_liability_payment, balloon_payment, monthly_depreciation_sl,
  lender_interest_rate, lender_term, portal_lease_id
)
select
  created_at, lease_status, new_swap_addition,
  customer_type, company, customer_name, location_driver,
  billing_address, billing_city, billing_state, billing_zip_code, phone, email_address,
  year, make, model, color, vin,
  odometer, odometer_date, ndvr_delivery_date,
  lease_start_date, term, lease_end_date,
  net_cap_cost, mon_dep, mon_interest, monthly_tax, mon_payment,
  residual_resale_quote, annual_miles, lease_end_mile_fee,
  ttl_state, ttl_mo::text, plate_number, insurance_expiration_date,
  upfront_tax_paid, lender_lessor, loan_lease_number,
  loan_lease_start_date, loan_lease_end_date, lender_net_cap_cost,
  monthly_payment, balloon_residual, monthly_depreciation_lender,
  lender_int_rate_pct, lender_term, portal_lease_id
from current_lease_info;

-- From expired_leases
insert into pritchard_lease_portfolio (
  created_at, lease_status, out_of_service_date,
  customer_type, company_name, customer_name, driver,
  billing_address, billing_city, billing_state, billing_zip_code, phone, email_address,
  model_year, make, model, color, vin,
  odometer, odometer_date, ndvr_date,
  lease_start_date, term, lease_end_date,
  net_cap_cost, monthly_depreciation, monthly_interest, monthly_tax, monthly_payment,
  lease_end_residual, annual_miles_limit, lease_end_mile_fee,
  title_state, registration_date, plate_number,
  lender, lender_loan_lease_number,
  liability_start_date, liability_end_date, funding_amount,
  monthly_liability_payment, balloon_payment, monthly_depreciation_sl,
  lender_interest_rate
)
select
  created_at, 'Expired', expired_date,
  customer_type, company, customer_name, location_driver,
  billing_address, billing_city, billing_state, billing_zip_code, phone, email_address,
  year, make, model, color, vin,
  odometer, odometer_date, ndvr_date,
  lease_start_date, term, lease_end_date,
  net_cap_cost, mon_dep, mon_interest, monthly_tax, mon_payment,
  residual_resale_quote, annual_miles, lease_end_mile_fee,
  ttl_state, ttl_mo::text, plate_number,
  lender_lessor, loan_lease_number,
  loan_lease_start_date, loan_lease_end_date, lender_net_cap_cost,
  monthly_payment, balloon_residual, monthly_depreciation_lender,
  lender_int_rate_pct
from expired_leases;

-- From sold_leases
insert into pritchard_lease_portfolio (
  created_at, lease_status,
  customer_type, company_name, customer_name, driver,
  billing_address, billing_city, billing_state, billing_zip_code, phone, email_address,
  model_year, make, model, color, vin, comments,
  odometer_at_time_of_sale, odometer_date, ndvr_date,
  lease_start_date, term, lease_end_date,
  net_cap_cost, monthly_depreciation, monthly_payment,
  lease_end_residual, annual_miles_limit, lease_end_mile_fee,
  title_state, registration_date, plate_number,
  tax_paid_upfront, sold_date, disposal_date, net_sale_price,
  lender, lender_loan_lease_number,
  liability_start_date, liability_end_date, funding_amount,
  monthly_liability_payment, balloon_payment, monthly_depreciation_sl,
  lender_interest_rate
)
select
  created_at, 'Purchased',
  customer_type, company, customer_name, location_driver,
  billing_address, billing_city, billing_state, billing_zip_code, phone, email_address,
  year, make, model, color, vin, comments,
  sold_odometer, odometer_date, ndvr_date,
  lease_start_date, term, lease_end_date,
  net_cap_cost, mon_dep, mon_payment,
  residual_resale_quote, annual_miles, lease_end_mile_fee,
  ttl_state, ttl_mo::text, plate_number,
  upfront_tax_paid, sold_date, disposal_date, mmr_net_sale_price,
  lender_lessor, loan_lease_number,
  loan_lease_start_date, loan_lease_end_date, lender_net_cap_cost,
  monthly_payment, balloon_residual, monthly_depreciation_lender,
  lender_int_rate_pct
from sold_leases;

-- ── Verify before proceeding to Step C ────────────────────────────────────────
-- Run this query and confirm counts match the old tables:
--   select lease_status, count(*) from pritchard_lease_portfolio group by lease_status;


-- ─── Step C: Update lease_documents check constraint ─────────────────────────

alter table lease_documents drop constraint if exists lease_documents_table_name_check;
alter table lease_documents add constraint lease_documents_table_name_check
  check (table_name in ('leases', 'pritchard_lease_portfolio'));


-- ─── Step D: Drop old tables ──────────────────────────────────────────────────

drop table if exists current_lease_info;
drop table if exists expired_leases;
drop table if exists sold_leases;
