-- Create contact_messages table
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  reason text,
  message text not null,
  created_at timestamptz not null default now()
);

-- Allow inserts from service role; RLS off by default for simplicity
alter table public.contact_messages enable row level security;

-- RLS policy to allow inserts from anon if needed via backend service (requests go through server, not client)
create policy if not exists contact_messages_insert on public.contact_messages
  for insert to anon, authenticated with check (true);
