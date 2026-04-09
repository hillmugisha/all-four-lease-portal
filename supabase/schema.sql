-- ═══════════════════════════════════════════════════════════════════════════
-- All Four Lease Portal — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists leases (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  doc_status  text        default 'draft'
              check (doc_status in ('draft', 'generated', 'sent', 'signed')),

  -- ─── Lessor (All Four, LLC — defaults pre-filled, editable per deal) ──────
  lessor_name     text not null default 'All Four, LLC',
  lessor_address  text not null default '1 TeamQuest Way',
  lessor_po_box   text          default 'P.O. Box 147',
  lessor_city     text not null default 'Clear Lake',
  lessor_state    text not null default 'IA',
  lessor_zip      text not null default '50428',

  -- ─── Lessee ───────────────────────────────────────────────────────────────
  lessee_name     text not null,
  lessee_address  text not null,
  lessee_city     text not null,
  lessee_state    text not null,
  lessee_zip      text not null,
  lessee_phone    text,
  lessee_email    text not null,

  -- ─── Lease ────────────────────────────────────────────────────────────────
  lease_date      date not null,

  -- ─── Vehicle ──────────────────────────────────────────────────────────────
  vehicle_condition  text not null check (vehicle_condition in ('NEW', 'USED')),
  vehicle_year       text not null,
  vehicle_make       text not null,
  vehicle_model      text not null,
  vehicle_body_style text not null,
  vehicle_vin        text not null,
  vehicle_odometer   text,

  -- ─── Gross Capitalized Cost Build-Up (Section 5 inputs) ──────────────────
  vehicle_agreed_value  numeric(12,2) not null default 0,
  taxes                 numeric(12,2) not null default 0,
  title_reg_fees        numeric(12,2) not null default 0,
  acquisition_fee       numeric(12,2) not null default 0,
  doc_fee               numeric(12,2) not null default 0,
  prior_lease_balance   numeric(12,2) not null default 0,  -- prior credit/lease balance on trade-in
  optional_products     numeric(12,2) not null default 0,  -- MBP + service contract + gap combined

  -- ─── Deal Economics ───────────────────────────────────────────────────────
  cap_cost_reduction    numeric(12,2) not null default 0,  -- cash down + rebates (excluding trade-in)
  residual_value        numeric(12,2) not null default 0,
  rent_charge           numeric(12,2) not null default 0,
  num_payments          integer       not null default 24,
  monthly_sales_tax     numeric(12,2) not null default 0,
  first_payment_date    date          not null,
  payment_day           integer       not null default 1,

  -- ─── Mileage ──────────────────────────────────────────────────────────────
  miles_per_year        integer       not null default 15000,
  excess_mileage_rate   numeric(6,4)  not null default 0.25,

  -- ─── Fees ─────────────────────────────────────────────────────────────────
  disposition_fee       numeric(12,2) not null default 195.00,
  early_termination_fee numeric(12,2) not null default 0,
  purchase_option_fee   numeric(12,2) not null default 0,

  -- ─── Trade-In (optional) ──────────────────────────────────────────────────
  tradein_year              text,
  tradein_make              text,
  tradein_model             text,
  tradein_gross_allowance   numeric(12,2) not null default 0,
  tradein_prior_balance     numeric(12,2) not null default 0,

  -- ─── Amount Due at Lease Signing — Itemization (left column) ─────────────
  -- These are the individual line items that add up to amount_due_at_signing.
  -- Each maps directly to a row in the "Itemization" table on the lease form.
  signing_cap_cost_reduction      numeric(12,2) not null default 0,   -- Capitalized cost reduction
  signing_first_monthly_payment   numeric(12,2) not null default 0,   -- First monthly payment (auto-filled = total monthly payment)
  signing_security_deposit        numeric(12,2) not null default 0,   -- Refundable security deposit
  signing_reconditioning_reserve  numeric(12,2) not null default 0,   -- Refundable reconditioning reserve
  signing_title_fees              numeric(12,2) not null default 0,   -- Title fees
  signing_registration_fees       numeric(12,2) not null default 0,   -- Registration fees
  signing_other_1_label           text,                               -- Custom line 1 label (e.g. "Gap insurance")
  signing_other_1_amount          numeric(12,2) not null default 0,   -- Custom line 1 amount
  signing_other_2_label           text,                               -- Custom line 2 label
  signing_other_2_amount          numeric(12,2) not null default 0,   -- Custom line 2 amount

  -- Total of above itemization — the number shown as "Amount Due at Signing"
  -- Calculated as sum of all signing_* fields above, stored here for the form/PDF
  amount_due_at_signing           numeric(12,2) not null default 0,

  -- ─── How Amount Due Will Be Paid (right column) ───────────────────────────
  -- These three rows must sum to amount_due_at_signing.
  signing_net_tradein_allowance   numeric(12,2) not null default 0,   -- Net trade-in** allowance
  signing_rebates_noncash         numeric(12,2) not null default 0,   -- Rebates and noncash credits
  signing_amount_paid_in_cash     numeric(12,2) not null default 0,   -- Amount to be paid in cash

  -- ─── Calculated Fields (derived, stored for audit trail & reporting) ──────
  gross_cap_cost                  numeric(12,2),
  net_tradein_allowance           numeric(12,2),
  adjusted_cap_cost               numeric(12,2),
  depreciation                    numeric(12,2),
  total_base_monthly_payments     numeric(12,2),
  base_monthly_payment            numeric(12,2),
  total_monthly_payment           numeric(12,2),
  total_of_payments               numeric(12,2),
  official_fees_taxes             numeric(12,2),

  -- ─── DocuSign (Phase 2) ───────────────────────────────────────────────────
  customer_signer_name   text,
  customer_signer_email  text,
  docusign_envelope_id   text,
  signed_at              timestamptz
);

-- ─── Auto-update updated_at on any row change ─────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leases_updated_at on leases;

create trigger leases_updated_at
  before update on leases
  for each row execute function update_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Currently open (allow all). Engineering team should lock this down to
-- authenticated users / specific roles before going live.
alter table leases enable row level security;

drop policy if exists "Allow all for authenticated and anon" on leases;

create policy "Allow all for authenticated and anon" on leases
  for all using (true) with check (true);

-- ─── Useful view for the dashboard table ─────────────────────────────────────
create or replace view lease_summary as
select
  id,
  created_at,
  status,
  lessee_name,
  lessee_email,
  vehicle_year || ' ' || vehicle_make || ' ' || vehicle_model as vehicle,
  vehicle_vin,
  lease_date,
  num_payments,
  total_monthly_payment,
  total_of_payments,
  amount_due_at_signing,
  customer_signer_name,
  signed_at
from leases
order by created_at desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- current_lease_info — imported from Active Leases.xlsx
-- Run in: Supabase Dashboard > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists current_lease_info (
  id                                  uuid          default gen_random_uuid() primary key,
  created_at                          timestamptz   default now(),

  -- Excel columns (in order)
  new_swap_addition                   text,
  company                             text,
  customer_type                       text,
  customer_name                       text,
  location_driver                     text,
  payment_method                      text,
  billing_address                     text,
  billing_city                        text,
  billing_state                       text,
  billing_zip_code                    text,
  phone                               text,
  email_address                       text,
  year                                text,
  make                                text,
  model                               text,
  color                               text,
  vin                                 text,
  comments                            text,
  ndvr_delivery_date                  text,
  odometer                            numeric(12,2),
  odometer_date                       text,
  lease_start_date                    text,
  term                                text,
  lease_end_date                      text,
  net_cap_cost                        numeric(12,2),
  mon_dep                             numeric(12,2),
  mon_interest                        numeric(12,2),
  monthly_tax                         text,
  mon_payment                         numeric(12,2),
  residual_resale_quote               numeric(12,2),
  annual_miles                        numeric(12,2),
  lease_end_mile_fee                  numeric(12,6),
  ttl_state                           text,
  ttl_mo                              numeric(12,2),
  plate_number                        text,
  lease_depreciation_months           numeric(12,6),
  insurance_expiration_date           text,
  upfront_tax_paid                    numeric(12,2),
  lender_lessor                       text,
  loan_lease_number                   text,
  loan_lease_start_date               text,
  loan_lease_end_date                 text,
  monthly_payment                     numeric(12,2),
  lender_net_cap_cost                 numeric(12,2),
  balloon_residual                    numeric(12,2),
  monthly_depreciation_lender         numeric(12,2),
  lender_int_rate_pct                 numeric(10,6),
  lender_term                         text,
  in_service_date                     text,
  internal_book_value                 numeric(12,2),
  lender_mo_dep_pct                   numeric(12,6),
  am                                  text,
  prorate_pd                          numeric(12,2),
  prorate_rcvd                        numeric(12,2),
  col_x1                              text,
  gps_serial_number                   text,
  monthly_cash_flow_delta             numeric(12,2),
  account_manager                     text,
  col_x2                              text,
  col_x3                              text,
  location                            text,
  mmr                                 numeric(12,2),
  balance_sheet_mar_2026              numeric(12,2),
  bal_sheet_delta                     numeric(12,2),
  nbv_apr_2026                        numeric(12,2),
  nbv_delta                           numeric(12,2),
  additional_comments                 text,
  disposal_comments_90_day            text,
  days_to_sell                        numeric(12,2),
  invoice_to_retail                   numeric(12,2),
  payoff_quoted_paid                  numeric(12,2),
  payoff_proceeds_sent                numeric(12,2),
  balance_sheet_apr_09_2026           numeric(12,2),
  customer_lease_depreciated_book_value numeric(12,2),
  vin_2                               text,

  -- Added column
  lease_status                        text          default 'Active'
);
