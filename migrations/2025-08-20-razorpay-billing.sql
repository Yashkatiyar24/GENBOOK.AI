-- Razorpay billing support: idempotency + IDs

-- 1) Idempotency table for webhooks
create table if not exists public.billing_events (
  event_id text primary key,
  provider text not null,
  created_at timestamptz default now()
);

alter table public.billing_events enable row level security;
create policy if not exists billing_events_tenantless on public.billing_events
  for select using (true);
create policy if not exists billing_events_insert on public.billing_events
  for insert with check (true);

-- 2) Store Razorpay subscription IDs alongside Stripe for compatibility
alter table public.subscriptions
  add column if not exists razorpay_subscription_id text;

-- Optional index to query by provider id quick (not unique)
create index if not exists subs_razorpay_sub_idx on public.subscriptions(razorpay_subscription_id);
