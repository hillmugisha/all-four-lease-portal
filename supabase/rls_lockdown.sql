-- RLS Lockdown Migration
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- After running this, the anon key has zero access to any table.
-- All data access goes through Next.js API routes which use the
-- service_role key (set via SUPABASE_SERVICE_ROLE_KEY in .env.local).

-- Drop the open "allow all" policies
DROP POLICY IF EXISTS "Allow all for authenticated and anon"   ON leases;
DROP POLICY IF EXISTS "Allow all for lease_documents"          ON lease_documents;
DROP POLICY IF EXISTS "Allow all for pritchard_lease_portfolio" ON pritchard_lease_portfolio;
DROP POLICY IF EXISTS "Allow all for audit_logs"               ON audit_logs;

-- Vehicles_On_Order — has 4 separate open policies (read/insert/update/delete)
DROP POLICY IF EXISTS "Allow read"   ON public."Vehicles_On_Order";
DROP POLICY IF EXISTS "Allow insert" ON public."Vehicles_On_Order";
DROP POLICY IF EXISTS "Allow update" ON public."Vehicles_On_Order";
DROP POLICY IF EXISTS "Allow delete" ON public."Vehicles_On_Order";

-- RLS is already enabled on all tables. With no permissive policy,
-- all anon/authenticated requests are denied by default.
-- The secret key bypasses RLS entirely, so API routes still work.
