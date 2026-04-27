-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add classification + lender-type fields to pritchard_lease_portfolio
--
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ═══════════════════════════════════════════════════════════════════════════

alter table pritchard_lease_portfolio
  add column if not exists contract_structure  text,   -- Closed-End Lease | TRAC / Open-End Lease | Rental / Short Term
  add column if not exists lease_type          text,   -- Core | Daily Rental | All Four Rental | Lakelife Rental
  add column if not exists vehicle_use_type    text,   -- Standard Customer Use | Company Demo | Company Vehicle | Service/Loaner | Rental Use
  add column if not exists lender_type         text;   -- Loan | Lease
