-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: NIE prefix on lease_ids
--
-- Root cause: generate_lease_id checked for '%NIE%' in lessor_name, but the
-- actual lessor name is "North Iowa Equity, LLC" which does not contain "NIE".
-- All NIE records were incorrectly assigned an A4- prefix.
--
-- This script:
--   1. Fixes the generate_lease_id function to match both 'NIE' and
--      'NORTH IOWA EQUITY'.
--   2. Fixes the auto_assign_lease_id trigger to fall back to company_name
--      when no portal lease is linked.
--   3. Renames all existing wrong A4-... lease_ids to NIE-... for records
--      where company_name is NIE.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Fix generate_lease_id function ───────────────────────────────────────

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


-- ─── 2. Fix auto_assign_lease_id trigger ─────────────────────────────────────
-- Also checks new.company_name as a fallback when no portal lease is linked.

create or replace function auto_assign_lease_id()
returns trigger language plpgsql as $$
declare
  lessor_val text;
begin
  if new.lease_id is null then
    -- Try to get lessor from the originating portal lease
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


-- ─── 3. Correct existing wrong A4-... lease_ids for NIE records ───────────────
-- Identifies rows where:
--   a) company_name indicates NIE, OR
--   b) the portal lease's lessor is North Iowa Equity
-- Then replaces the 'A4' prefix with 'NIE'.
--
-- 'A4-2026-000001' → 'NIE' || substring(from 3) = 'NIE' || '-2026-000001'
--                  → 'NIE-2026-000001'

update pritchard_lease_portfolio
set lease_id = 'NIE' || substring(lease_id from 3)
where lease_id like 'A4-%'
  and (
    -- Imported records: company_name carries the entity indicator
    upper(coalesce(company_name, '')) like '%NIE%'

    -- Portal-activated records: check lessor on the originating lease
    or (
      portal_lease_id is not null
      and exists (
        select 1 from leases l
        where l.id = portal_lease_id
          and (
            upper(l.lessor_name) like '%NIE%'
            or upper(l.lessor_name) like '%NORTH IOWA EQUITY%'
          )
      )
    )
  );


-- ─── 4. Verify ────────────────────────────────────────────────────────────────
-- After running, check prefix distribution by company:
--
--   select
--     company_name,
--     substring(lease_id for 3) as prefix,
--     count(*) as total
--   from pritchard_lease_portfolio
--   where lease_id is not null
--   group by company_name, prefix
--   order by company_name, prefix;
--
-- NIE company rows should only have 'NIE' prefix.
-- All Four rows should only have 'A4-' prefix.
