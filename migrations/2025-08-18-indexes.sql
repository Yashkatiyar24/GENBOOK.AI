-- Recommended indexes for performance
-- Safe-guard: use IF NOT EXISTS to avoid errors on re-run

-- Appointments lookups by tenant and time
create index if not exists idx_appointments_tenant_start
  on public.appointments (tenant_id, start_time);

-- Appointments by creator for dashboards
create index if not exists idx_appointments_created_by
  on public.appointments (created_by);

-- Analytics events example (if table exists)
-- create index if not exists idx_events_tenant_created_at
--   on public.events (tenant_id, created_at desc);

-- Tenants quick lookups
create index if not exists idx_tenants_external_id
  on public.tenants (external_id);

-- Team membership lookups
create index if not exists idx_team_members_tenant_user
  on public.team_members (tenant_id, user_id);
