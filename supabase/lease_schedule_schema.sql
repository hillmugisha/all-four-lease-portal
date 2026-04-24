-- Lease Schedules table
-- A Lease Schedule is a per-vehicle addendum to a Master Lease Agreement.
-- It stores parties info, per-vehicle financial terms, and DocuSign state.

create table lease_schedules (
  id                     bigserial primary key,

  -- Lessor
  lessor_name            text,
  lessor_address         text,
  lessor_po_box          text,
  lessor_city            text,
  lessor_state           text,
  lessor_zip             text,

  -- Lessee
  lessee_name            text,
  lessee_type            text,        -- 'business' | 'individual'
  lessee_first_name      text,
  lessee_last_name       text,
  lessee_location        text,
  lessee_address         text,
  lessee_city            text,
  lessee_state           text,
  lessee_zip             text,
  lessee_phone           text,
  lessee_email           text,

  -- Lease classification
  lease_type             text,
  contract_structure     text,
  customer_type          text,
  vehicle_use            text,
  department             text,
  department_other       text,

  -- Per-vehicle financial data (JSON array of LeaseScheduleVehicleEntry)
  vehicles_json          jsonb,

  -- Signatories
  lessor_signer_name     text,
  lessor_signer_email    text,
  lessor_signer_title    text,
  customer_signer_name   text,
  customer_signer_email  text,
  co_lessee_signer_name  text,

  -- Optional link back to a master lease agreement
  master_lease_ref       text,        -- free-text reference e.g. "MLA dated April 24, 2026"
  schedule_date          date,

  -- DocuSign
  docusign_envelope_id   text,
  doc_status             text,        -- null | 'sent' | 'completed'

  -- Metadata
  is_active              boolean not null default false,
  created_at             timestamptz not null default now(),
  signed_at              timestamptz
);

-- Enable RLS (open policies matching the leases table pattern)
alter table lease_schedules enable row level security;

create policy "Allow all reads"   on lease_schedules for select using (true);
create policy "Allow all inserts" on lease_schedules for insert with check (true);
create policy "Allow all updates" on lease_schedules for update using (true);
create policy "Allow all deletes" on lease_schedules for delete using (true);
