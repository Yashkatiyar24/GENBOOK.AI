-- Communications Phase 2 schema
-- Tenant isolation via current_setting('app.current_tenant_id')

begin;

-- Conversations
create table if not exists public.communications_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text,
  type text check (type in ('care','billing','general')) default 'care',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.communications_participants (
  conversation_id uuid not null references public.communications_conversations(id) on delete cascade,
  user_id uuid,
  contact_id uuid,
  role text check (role in ('provider','patient')) not null,
  last_read_at timestamptz,
  added_at timestamptz not null default now(),
  constraint participants_pk primary key (conversation_id, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(contact_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create table if not exists public.communications_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  conversation_id uuid not null references public.communications_conversations(id) on delete cascade,
  sender_user_id uuid,
  sender_contact_id uuid,
  body text,
  attachment_urls text[] default '{}',
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Telehealth sessions
create table if not exists public.telehealth_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  provider_user_id uuid,
  patient_contact_id uuid,
  status text check (status in ('scheduled','live','ended')) not null default 'scheduled',
  meeting_provider text default 'daily',
  provider_payload jsonb default '{}',
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now()
);

-- Notification templates
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text check (channel in ('email','sms','in_app')) not null,
  key text not null,
  subject text,
  body_md text,
  enabled boolean not null default true,
  unique (tenant_id, channel, key)
);

-- Notification jobs
create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text check (channel in ('email','sms','in_app')) not null,
  template_key text,
  payload jsonb not null,
  scheduled_for timestamptz not null default now(),
  status text check (status in ('queued','processing','succeeded','failed')) not null default 'queued',
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User notification preferences
create table if not exists public.user_notification_prefs (
  user_id uuid not null,
  tenant_id uuid not null,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  phone text,
  quiet_hours jsonb default '{"start":"21:00","end":"08:00"}',
  updated_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- Patient consent tracking
create table if not exists public.patient_consent (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  tenant_id uuid not null,
  sms_opt_in boolean not null default false,
  email_opt_in boolean not null default true,
  consent_source text,
  consent_at timestamptz default now(),
  primary key (contact_id, tenant_id)
);

-- Communication audit log
create table if not exists public.comm_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  actor_user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_messages_conv_ts on public.communications_messages (tenant_id, conversation_id, created_at desc);
create index if not exists idx_jobs_status_time on public.notification_jobs (tenant_id, status, scheduled_for);
create index if not exists idx_telehealth_appt on public.telehealth_sessions (tenant_id, appointment_id);

-- RLS
alter table public.communications_conversations enable row level security;
alter table public.communications_participants enable row level security;
alter table public.communications_messages enable row level security;
alter table public.telehealth_sessions enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.user_notification_prefs enable row level security;
alter table public.patient_consent enable row level security;
alter table public.comm_audit_log enable row level security;

-- Helper policy macro
-- We use the current tenant id from the app setting for all actions
create policy if not exists convs_tenant on public.communications_conversations
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists parts_tenant on public.communications_participants
  using (
    (select tenant_id from public.communications_conversations c where c.id = conversation_id)::text = current_setting('app.current_tenant_id', true)
  )
  with check (
    (select tenant_id from public.communications_conversations c where c.id = conversation_id)::text = current_setting('app.current_tenant_id', true)
  );

create policy if not exists msgs_tenant on public.communications_messages
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists tele_tenant on public.telehealth_sessions
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists tpl_tenant on public.notification_templates
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists jobs_tenant on public.notification_jobs
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists prefs_tenant on public.user_notification_prefs
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists consent_tenant on public.patient_consent
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy if not exists audit_tenant on public.comm_audit_log
  using (tenant_id::text = current_setting('app.current_tenant_id', true))
  with check (tenant_id::text = current_setting('app.current_tenant_id', true));

commit;
