-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: assign lease_id to all existing pritchard_lease_portfolio rows
--
-- PREREQUISITES: Run migration_mla_and_lease_ids.sql first (creates
--   lease_id_seq, generate_lease_id function, and the lease_id column).
--
-- SAFE TO RUN ONCE: Only touches rows where lease_id IS NULL.
-- Uses the row's lease_start_date year (falling back to created_at year)
-- so the year component reflects when the lease was actually active.
-- Prefix: 'NIE' when portal lease's lessor contains 'NIE', else 'A4'.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── Step 1: Helper — safe text→date cast ────────────────────────────────────
-- lease_start_date is stored as text; this avoids crashing on bad values.

create or replace function try_cast_date(val text)
returns date language plpgsql as $$
begin
  return val::date;
exception when others then
  return null;
end;
$$;


-- ─── Step 2: Backfill lease_id for every row that is missing one ──────────────

do $$
declare
  rec         record;
  lessor_val  text;
  yr          int;
  prefix_val  text;
  new_id      text;
begin
  for rec in
    select
      p.id,
      p.portal_lease_id,
      p.company_name,
      p.lease_start_date,
      p.created_at
    from pritchard_lease_portfolio p
    where p.lease_id is null
    order by
      -- Process chronologically so IDs loosely track historical order
      coalesce(try_cast_date(p.lease_start_date), p.created_at::date) asc,
      p.created_at asc
  loop
    -- ── Determine prefix (A4 vs NIE) ──────────────────────────────────────
    lessor_val := null;
    if rec.portal_lease_id is not null then
      select lessor_name into lessor_val
        from leases
       where id = rec.portal_lease_id;
    end if;

    -- Fall back to company_name on the portfolio row for imported records
    prefix_val := case
      when upper(coalesce(lessor_val, rec.company_name, '')) like '%NIE%'
        or upper(coalesce(lessor_val, rec.company_name, '')) like '%NORTH IOWA EQUITY%'
      then 'NIE'
      else 'A4'
    end;

    -- ── Determine year from lease_start_date, fall back to created_at ─────
    yr := extract(year from
      coalesce(
        try_cast_date(rec.lease_start_date),
        rec.created_at::date
      )
    )::int;

    -- ── Build ID: prefix + year + global sequence (6-digit, zero-padded) ──
    new_id := prefix_val
              || '-' || yr::text
              || '-' || lpad(nextval('lease_id_seq')::text, 6, '0');

    update pritchard_lease_portfolio
       set lease_id = new_id
     where id = rec.id;
  end loop;

  raise notice 'Backfill complete. lease_id_seq is now at: %', last_value
    from lease_id_seq;
end;
$$;


-- ─── Step 3: Verify ───────────────────────────────────────────────────────────
-- After running, confirm no NULLs remain and IDs are unique:
--
--   select count(*) filter (where lease_id is null) as missing,
--          count(*) filter (where lease_id is not null) as filled,
--          count(distinct lease_id) as unique_ids
--   from pritchard_lease_portfolio;
--
-- All three counts should be: missing=0, filled=total rows, unique_ids=filled.
