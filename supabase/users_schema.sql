-- Users table: manually managed access list
-- Add rows here to grant portal access: INSERT INTO users (email, name) VALUES ('you@pritchards.com', 'Your Name');
-- Set access_granted = false to revoke access without deleting the row.

create table if not exists public.users (
  id             uuid        default gen_random_uuid() primary key,
  email          text        unique not null,
  name           text,
  access_granted bool        not null default true,
  login_count    int4        not null default 0,
  last_login     timestamptz,
  created_at     timestamptz default now()
);

-- Allow anon key to look up emails (for login check) but nothing else
alter table public.users enable row level security;

create policy "Allow email lookup" on public.users
  for select using (true);

-- If you already created the table without these columns, run these to add them:
-- alter table public.users add column if not exists access_granted bool not null default true;
-- alter table public.users add column if not exists login_count int4 not null default 0;
-- alter table public.users add column if not exists last_login timestamptz;
