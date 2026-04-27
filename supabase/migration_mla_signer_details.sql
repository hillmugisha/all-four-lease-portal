-- Add signer detail columns to master_lease_agreements
alter table master_lease_agreements
  add column if not exists customer_signer_title    text,
  add column if not exists lessor_signer_first_name text,
  add column if not exists lessor_signer_last_name  text,
  add column if not exists lessor_signer_email      text,
  add column if not exists lessor_signer_title      text;
