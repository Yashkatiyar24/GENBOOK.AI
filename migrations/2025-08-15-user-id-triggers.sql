-- Triggers to enforce NEW.user_id = auth.uid() for authenticated clients
-- and to keep user_id immutable (except for service_role)

-- Helper function: set/validate user_id on INSERT
create or replace function public.enforce_user_id_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only apply to authenticated JWT contexts. service_role/anon are allowed to bypass/leave as-is.
  if auth.role() = 'authenticated' then
    if NEW.user_id is null then
      NEW.user_id := auth.uid();
    end if;
    if NEW.user_id is distinct from auth.uid() then
      raise exception 'user_id must match auth.uid() for authenticated clients';
    end if;
  end if;
  return NEW;
end;
$$;

-- Helper function: prevent changing user_id on UPDATE for authenticated clients
create or replace function public.enforce_user_id_immutable()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.role() = 'authenticated' then
    if NEW.user_id is distinct from OLD.user_id then
      raise exception 'user_id is immutable';
    end if;
  end if;
  return NEW;
end;
$$;

-- Attach triggers to user-owned tables
-- appointments
create trigger appointments_user_id_ins
  before insert on public.appointments
  for each row execute function public.enforce_user_id_insert();

create trigger appointments_user_id_upd
  before update on public.appointments
  for each row execute function public.enforce_user_id_immutable();

-- contacts
create trigger contacts_user_id_ins
  before insert on public.contacts
  for each row execute function public.enforce_user_id_insert();

create trigger contacts_user_id_upd
  before update on public.contacts
  for each row execute function public.enforce_user_id_immutable();

-- user_settings
create trigger user_settings_user_id_ins
  before insert on public.user_settings
  for each row execute function public.enforce_user_id_insert();

create trigger user_settings_user_id_upd
  before update on public.user_settings
  for each row execute function public.enforce_user_id_immutable();

-- user_profiles
create trigger user_profiles_user_id_ins
  before insert on public.user_profiles
  for each row execute function public.enforce_user_id_insert();

create trigger user_profiles_user_id_upd
  before update on public.user_profiles
  for each row execute function public.enforce_user_id_immutable();

-- family_members
create trigger family_members_user_id_ins
  before insert on public.family_members
  for each row execute function public.enforce_user_id_insert();

create trigger family_members_user_id_upd
  before update on public.family_members
  for each row execute function public.enforce_user_id_immutable();

-- appointment_analytics
create trigger appointment_analytics_user_id_ins
  before insert on public.appointment_analytics
  for each row execute function public.enforce_user_id_insert();

create trigger appointment_analytics_user_id_upd
  before update on public.appointment_analytics
  for each row execute function public.enforce_user_id_immutable();
