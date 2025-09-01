-- Billing and usage tables

create table if not exists public.subscriptions (
  tenant_id uuid primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.payments (
  id bigserial primary key,
  tenant_id uuid not null,
  stripe_invoice_id text not null,
  amount bigint,
  currency text,
  status text,
  paid_at timestamptz,
  hosted_invoice_url text,
  created_at timestamptz default now()
);
create index if not exists payments_tenant_idx on public.payments(tenant_id);

create table if not exists public.usage_counters (
  tenant_id uuid not null,
  metric text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  count integer not null default 0,
  primary key (tenant_id, metric, period_start)
);

-- Ensure RLS
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.usage_counters enable row level security;

-- Basic tenant isolation policies (expects set_tenant_context to set current_setting('app.current_tenant_id'))
create policy if not exists subs_tenant_isolation on public.subscriptions
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists payments_tenant_isolation on public.payments
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists usage_tenant_isolation on public.usage_counters
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Optional helper to set tenant context if missing
create or replace function public.set_tenant_context(tenant_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('app.current_tenant_id', tenant_id::text, true);
end; $$;
