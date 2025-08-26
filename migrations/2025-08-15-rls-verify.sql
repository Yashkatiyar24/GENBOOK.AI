-- RLS/Triggers Verification Script
-- Purpose: Print PASS/FAIL checks for RLS enabled, policies present, and triggers installed.
-- Usage: Run in Supabase SQL editor (will run as service role), or in staging migration pipeline for visibility.

-- Helper: print PASS/FAIL
create or replace function public._assert(cond boolean, pass_msg text, fail_msg text)
returns void language plpgsql as $$
begin
  if cond then
    raise notice '[PASS] %', pass_msg;
  else
    raise notice '[FAIL] %', fail_msg;
  end if;
end; $$;

-- Check RLS enabled on key tables
with rls as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname in (
      'appointments','contacts','user_settings','user_profiles','family_members','appointment_analytics','contact_messages'
    )
)
select public._assert(
  (select bool_and(rls_enabled) from rls),
  'RLS enabled on all target tables',
  'RLS NOT enabled on some target tables'
);

-- Check policies exist per table (simple presence check)
with pol as (
  select tablename, array_agg(policyname order by policyname) as names
  from pg_policies
  where schemaname = 'public' and tablename in (
    'appointments','contacts','user_settings','user_profiles','family_members','appointment_analytics','contact_messages'
  )
  group by tablename
)
select public._assert(
  (select 'appointments_select_own'=any(names) and 'appointments_insert_own'=any(names)
          and 'appointments_update_own'=any(names) and 'appointments_delete_own'=any(names)
   from pol where tablename='appointments')
  and
  (select 'contacts_select_own'=any(names) and 'contacts_insert_own'=any(names)
          and 'contacts_update_own'=any(names) and 'contacts_delete_own'=any(names)
   from pol where tablename='contacts')
  and
  (select 'user_settings_select_own'=any(names) and 'user_settings_insert_own'=any(names)
          and 'user_settings_update_own'=any(names) and 'user_settings_delete_own'=any(names)
   from pol where tablename='user_settings')
  and
  (select 'user_profiles_select_own'=any(names) and 'user_profiles_insert_own'=any(names)
          and 'user_profiles_update_own'=any(names) and 'user_profiles_delete_own'=any(names)
   from pol where tablename='user_profiles')
  and
  (select 'family_members_select_own'=any(names) and 'family_members_insert_own'=any(names)
          and 'family_members_update_own'=any(names) and 'family_members_delete_own'=any(names)
   from pol where tablename='family_members')
  and
  (select 'appointment_analytics_select_own'=any(names) and 'appointment_analytics_insert_own'=any(names)
          and 'appointment_analytics_update_own'=any(names) and 'appointment_analytics_delete_own'=any(names)
   from pol where tablename='appointment_analytics')
  and
  (select 'contact_messages_insert_only'=any(names) from pol where tablename='contact_messages')
,
  'All expected policies are present',
  'Missing one or more expected policies'
);

-- Check contact_messages is insert-only for anon/auth (policy present to roles)
select public._assert(
  exists (
    select 1 from pg_policies p
    where p.schemaname='public' and p.tablename='contact_messages'
      and p.policyname='contact_messages_insert_only' and p.cmd='INSERT'
  ),
  'contact_messages insert-only policy exists',
  'contact_messages insert-only policy missing'
);

-- Check trigger functions exist
select public._assert(
  exists (select 1 from pg_proc where proname='enforce_user_id_insert' and pronamespace = 'public'::regnamespace)
  and   exists (select 1 from pg_proc where proname='enforce_user_id_immutable' and pronamespace = 'public'::regnamespace),
  'Trigger functions present',
  'Missing trigger functions'
);

-- Check triggers attached to each table
with trg as (
  select t.tgname, c.relname as table_name
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and not t.tgisinternal
)
select public._assert(
  -- appointments
  exists(select 1 from trg where table_name='appointments' and tgname='appointments_user_id_ins') and
  exists(select 1 from trg where table_name='appointments' and tgname='appointments_user_id_upd') and
  -- contacts
  exists(select 1 from trg where table_name='contacts' and tgname='contacts_user_id_ins') and
  exists(select 1 from trg where table_name='contacts' and tgname='contacts_user_id_upd') and
  -- user_settings
  exists(select 1 from trg where table_name='user_settings' and tgname='user_settings_user_id_ins') and
  exists(select 1 from trg where table_name='user_settings' and tgname='user_settings_user_id_upd') and
  -- user_profiles
  exists(select 1 from trg where table_name='user_profiles' and tgname='user_profiles_user_id_ins') and
  exists(select 1 from trg where table_name='user_profiles' and tgname='user_profiles_user_id_upd') and
  -- family_members
  exists(select 1 from trg where table_name='family_members' and tgname='family_members_user_id_ins') and
  exists(select 1 from trg where table_name='family_members' and tgname='family_members_user_id_upd') and
  -- appointment_analytics
  exists(select 1 from trg where table_name='appointment_analytics' and tgname='appointment_analytics_user_id_ins') and
  exists(select 1 from trg where table_name='appointment_analytics' and tgname='appointment_analytics_user_id_upd')
,
  'All expected triggers are attached',
  'Missing one or more triggers'
);

-- Optional: suggest functional tests (cannot simulate auth.uid() here)
raise notice 'INFO: Functional tests (auth.uid()) must be verified via client or SQL with a JWT';
