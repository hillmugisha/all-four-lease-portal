-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: MLA table, stable lease IDs, and MLA flag on portfolio
--
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Run sections in order. Safe to re-run — all DDL uses IF NOT EXISTS / OR REPLACE.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Sequences ─────────────────────────────────────────────────────────────

-- Global lease_id sequence — never resets, supports 999,999 unique IDs
-- (~333 years at 3,000 activations/year)
create sequence if not exists lease_id_seq start 1;

-- Global MLA number sequence
create sequence if not exists mla_number_seq start 1;


-- ─── 2. master_lease_agreements table ────────────────────────────────────────

create table if not exists master_lease_agreements (
  id            uuid        default gen_random_uuid() primary key,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,

  -- Human-readable identifier, auto-generated on insert (e.g. MLA-2026-0001)
  mla_number    text unique,

  -- Workflow state
  status        text not null default 'draft'
                check (status in ('draft', 'sent', 'executed')),
  executed_date date,

  -- Lessor (All Four, LLC defaults)
  lessor_name     text not null default 'All Four, LLC',
  lessor_address  text not null default '1 TeamQuest Way',
  lessor_po_box   text          default 'P.O. Box 147',
  lessor_city     text not null default 'Clear Lake',
  lessor_state    text not null default 'IA',
  lessor_zip      text not null default '50428',

  -- Lessee
  lessee_name       text not null,
  lessee_type       text,
  lessee_first_name text,
  lessee_last_name  text,
  lessee_location   text,
  lessee_address    text not null,
  lessee_city       text not null,
  lessee_state      text not null,
  lessee_zip        text not null,
  lessee_phone      text,
  lessee_email      text not null,

  -- Classification (same as leases table)
  lease_type         text,
  contract_structure text,
  customer_type      text,
  vehicle_use        text,

  -- DocuSign
  customer_signer_name  text,
  customer_signer_email text,
  docusign_envelope_id  text,
  sent_at               timestamptz,
  signed_at             timestamptz,

  -- Back-link to the portal lease record used to create this MLA (optional)
  portal_lease_id       uuid
);

-- Auto-update updated_at
create trigger master_lease_agreements_updated_at
  before update on master_lease_agreements
  for each row execute function update_updated_at();

-- RLS (open — matches existing tables)
alter table master_lease_agreements enable row level security;
drop policy if exists "Allow all for master_lease_agreements" on master_lease_agreements;
create policy "Allow all for master_lease_agreements" on master_lease_agreements
  for all using (true) with check (true);


-- ─── 3. Auto-generate mla_number on insert ────────────────────────────────────

create or replace function set_mla_number()
returns trigger language plpgsql as $$
begin
  if new.mla_number is null or new.mla_number = '' then
    new.mla_number :=
      'MLA-' ||
      extract(year from now())::text ||
      '-' ||
      lpad(nextval('mla_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists mla_number_trigger on master_lease_agreements;
create trigger mla_number_trigger
  before insert on master_lease_agreements
  for each row execute function set_mla_number();


-- ─── 4. generate_lease_id function ───────────────────────────────────────────
-- Produces e.g. "A4-2026-000047" or "NIE-2026-000047"
-- Prefix: 'NIE' when lessor_name starts with or contains 'NIE', else 'A4'

create or replace function generate_lease_id(lessor text)
returns text language plpgsql as $$
declare
  prefix   text;
  seq_val  bigint;
begin
  prefix := case
    when upper(coalesce(lessor, '')) like '%NIE%'
      or upper(coalesce(lessor, '')) like '%NORTH IOWA EQUITY%'
    then 'NIE'
    else 'A4'
  end;
  seq_val := nextval('lease_id_seq');
  return prefix || '-' || extract(year from now())::text || '-' || lpad(seq_val::text, 6, '0');
end;
$$;


-- ─── 5. Auto-assign lease_id on portfolio insert ──────────────────────────────
-- Fires when a new row is inserted with portal_lease_id set (portal-activated lease).
-- Looks up the lessor_name from the leases table to determine the prefix.
-- Rows without a portal_lease_id (manual imports) keep lease_id = NULL.

create or replace function auto_assign_lease_id()
returns trigger language plpgsql as $$
declare
  lessor_val text;
begin
  if new.lease_id is null then
    if new.portal_lease_id is not null then
      select lessor_name into lessor_val
        from leases
       where id = new.portal_lease_id;
    end if;
    -- Fall back to company_name on the portfolio row itself
    new.lease_id := generate_lease_id(
      coalesce(lessor_val, new.company_name, 'All Four, LLC')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists auto_lease_id_trigger on pritchard_lease_portfolio;
create trigger auto_lease_id_trigger
  before insert on pritchard_lease_portfolio
  for each row execute function auto_assign_lease_id();


-- ─── 6. New columns on pritchard_lease_portfolio ──────────────────────────────

alter table pritchard_lease_portfolio
  add column if not exists lease_id  text unique,
  add column if not exists mla_id    uuid references master_lease_agreements(id),
  add column if not exists mla_flag  boolean not null default false;


-- ─── 7. New column on leases (FK to master_lease_agreements) ─────────────────

alter table leases
  add column if not exists mla_id uuid references master_lease_agreements(id);


-- ─── 8. New columns on lease_schedules ───────────────────────────────────────
-- mla_id replaces the free-text master_lease_ref for formally-linked schedules.
-- master_lease_ref is kept for backward-compatibility with existing records.

alter table lease_schedules
  add column if not exists mla_id uuid references master_lease_agreements(id);
