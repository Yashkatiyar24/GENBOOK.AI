-- GENBOOK.AI RLS Policies for user-owned data
-- This migration enables RLS and adds least-privilege policies scoped by auth.uid()
-- Apply in Supabase SQL editor or via your migration runner.

-- Helper: enable RLS safely
create or replace function public._enable_rls(tbl regclass) returns void language plpgsql as $$
begin
  execute format('alter table %s enable row level security', tbl);
exception when others then
  raise notice 'enable rls failed on %: %', tbl, sqlerrm;
end; $$;

-- Tables with user_id ownership
-- appointments
select public._enable_rls('public.appointments'::regclass);
create policy if not exists appointments_select_own on public.appointments
  for select using (user_id = auth.uid());
create policy if not exists appointments_insert_own on public.appointments
  for insert with check (user_id = auth.uid());
create policy if not exists appointments_update_own on public.appointments
  for update using (user_id = auth.uid());
create policy if not exists appointments_delete_own on public.appointments
  for delete using (user_id = auth.uid());

-- contacts
select public._enable_rls('public.contacts'::regclass);
create policy if not exists contacts_select_own on public.contacts
  for select using (user_id = auth.uid());
create policy if not exists contacts_insert_own on public.contacts
  for insert with check (user_id = auth.uid());
create policy if not exists contacts_update_own on public.contacts
  for update using (user_id = auth.uid());
create policy if not exists contacts_delete_own on public.contacts
  for delete using (user_id = auth.uid());

-- user_settings
select public._enable_rls('public.user_settings'::regclass);
create policy if not exists user_settings_select_own on public.user_settings
  for select using (user_id = auth.uid());
create policy if not exists user_settings_insert_own on public.user_settings
  for insert with check (user_id = auth.uid());
create policy if not exists user_settings_update_own on public.user_settings
  for update using (user_id = auth.uid());
create policy if not exists user_settings_delete_own on public.user_settings
  for delete using (user_id = auth.uid());

-- user_profiles
select public._enable_rls('public.user_profiles'::regclass);
create policy if not exists user_profiles_select_own on public.user_profiles
  for select using (user_id = auth.uid());
create policy if not exists user_profiles_insert_own on public.user_profiles
  for insert with check (user_id = auth.uid());
create policy if not exists user_profiles_update_own on public.user_profiles
  for update using (user_id = auth.uid());
create policy if not exists user_profiles_delete_own on public.user_profiles
  for delete using (user_id = auth.uid());

-- family_members
select public._enable_rls('public.family_members'::regclass);
create policy if not exists family_members_select_own on public.family_members
  for select using (user_id = auth.uid());
create policy if not exists family_members_insert_own on public.family_members
  for insert with check (user_id = auth.uid());
create policy if not exists family_members_update_own on public.family_members
  for update using (user_id = auth.uid());
create policy if not exists family_members_delete_own on public.family_members
  for delete using (user_id = auth.uid());

-- appointment_analytics
select public._enable_rls('public.appointment_analytics'::regclass);
create policy if not exists appointment_analytics_select_own on public.appointment_analytics
  for select using (user_id = auth.uid());
create policy if not exists appointment_analytics_insert_own on public.appointment_analytics
  for insert with check (user_id = auth.uid());
create policy if not exists appointment_analytics_update_own on public.appointment_analytics
  for update using (user_id = auth.uid());
create policy if not exists appointment_analytics_delete_own on public.appointment_analytics
  for delete using (user_id = auth.uid());

-- contact_messages is write-only from app perspective; do not allow client reads/updates/deletes
-- tighten to insert-only for anon/auth; service role bypasses RLS by design in Supabase
select public._enable_rls('public.contact_messages'::regclass);
-- Drop overly-permissive policies if exist (safe no-op if absent)
drop policy if exists contact_messages_insert on public.contact_messages;
drop policy if exists contact_messages_select on public.contact_messages;
drop policy if exists contact_messages_update on public.contact_messages;
drop policy if exists contact_messages_delete on public.contact_messages;
-- Allow only insert from anon/auth; no select/update/delete from clients
create policy if not exists contact_messages_insert_only on public.contact_messages
  for insert to anon, authenticated with check (true);

-- Notes:
-- - Supabase service role bypasses RLS; backend ops remain unaffected.
-- - Ensure all client writes set user_id = auth.uid(); consider database triggers to enforce/normalize.
-- - If you later adopt multi-tenant orgs, replace user_id checks with tenant_id checks and join against a membership table.
