-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: add document_url to master_lease_agreements
--
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run — uses IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════

alter table master_lease_agreements
  add column if not exists document_url text;

-- After running this migration, create the storage bucket in the Supabase
-- dashboard: Storage > New bucket > Name: "mla-documents" > Public: true
-- The API routes will also attempt to create it automatically on first use.
