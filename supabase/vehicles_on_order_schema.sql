-- Vehicles on Order table
-- Run this in the Supabase SQL editor before importing data.

create table if not exists public."Vehicles_On_Order" (
  id                             bigserial primary key,
  stock_number                   text,
  customer_name                  text,
  sales_person                   text,
  oem                            text,
  oem_order_number               text,
  model_year                     text,
  body_code                      text,
  vin                            text,
  customer_po_number             text,
  customer_po_date               text,
  tracking_type                  text,
  order_date                     text,
  vehicle_line                   text,
  color                          text,
  ship_to_location               text,
  target_production_week         text,
  oem_status                     text,
  chassis_eta                    text,
  shaed_status                   text,
  customer_invoice_number        text,
  invoice_amount                 text,
  invoice_date                   text,
  invoice_due_date               text,
  payment_date                   text,
  upfitter_name                  text,
  date_received_at_upfitter      text,
  upfit_status                   text,
  estimated_upfit_completion_date text,
  actual_upfit_completion_date   text,
  logistics_status               text,
  expected_delivery_date         text,
  stage                          text,
  inventory_type                 text,
  created_at                     timestamptz default now()
);

-- Enable Row Level Security (open read for authenticated users)
alter table public."Vehicles_On_Order" enable row level security;

create policy "Allow read" on public."Vehicles_On_Order"
  for select using (true);

create policy "Allow insert" on public."Vehicles_On_Order"
  for insert with check (true);

create policy "Allow update" on public."Vehicles_On_Order"
  for update using (true);

create policy "Allow delete" on public."Vehicles_On_Order"
  for delete using (true);

-- Migration: add app-owned data column (run once in Supabase SQL editor)
-- New fields are stored as JSON keys — no further migrations needed for new fields.
alter table public."Vehicles_On_Order"
  add column if not exists app_data jsonb default '{}';

-- Migration: disposition tracking — null = on order, 'leased' | 'sold' | 'out_of_service'
alter table public."Vehicles_On_Order"
  add column if not exists disposition text
  check (disposition is null or disposition in ('leased', 'sold', 'out_of_service'));
