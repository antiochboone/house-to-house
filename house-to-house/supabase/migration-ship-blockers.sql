-- ============================================================================
-- Ship-blocker fixes. Run once in the Supabase SQL Editor. Safe to re-run.
--
-- 1. Membership history: allow re-joining a group someone previously left
--    (uniqueness now applies to ACTIVE rows only). Fixes role changes and
--    merges failing with duplicate-key errors after the row was already ended.
-- 2. set_app_access RPC: granting access now also connects people who already
--    have an auth account (the sign-in trigger only fires on account
--    creation, so grant-after-first-login used to dead-end in an empty app).
-- 3. Guard trigger: only staff can set people.app_access — closes the hole
--    where a leader could insert a person with app_access='staff' and an
--    email they control, then sign in as staff.
-- 4. Deleting a person now deletes their login profile too (previously the
--    profile survived with its role, so a deleted staff member could still
--    sign in with full access).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Membership uniqueness: one ACTIVE row per person+group; history rows
--    (left_at set) may repeat — leaving and re-joining is real life.
-- ---------------------------------------------------------------------------
alter table memberships drop constraint if exists memberships_person_id_group_id_key;
create unique index if not exists memberships_active_unique
  on memberships (person_id, group_id) where left_at is null;

-- ---------------------------------------------------------------------------
-- 2. Staff set someone's access in one call. Updates people.app_access and,
--    when the person already has an auth account for their email, upserts
--    the profile immediately — no waiting on a sign-in trigger that will
--    never fire again. Revoking deletes the profile.
-- ---------------------------------------------------------------------------
create or replace function public.set_app_access(p_person_id uuid, p_level text)
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_person people%rowtype;
  v_uid uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff can change app access';
  end if;
  if p_level not in ('none','leader','staff') then
    raise exception 'Invalid access level: %', p_level;
  end if;

  select * into v_person
  from people
  where id = p_person_id and church_id = public.current_church_id();
  if not found then
    raise exception 'Person not found';
  end if;

  update people set app_access = p_level where id = p_person_id;

  if p_level = 'none' then
    delete from profiles where person_id = p_person_id;
    return;
  end if;

  -- Existing login for this email? Connect / upgrade it right now.
  if v_person.email is not null then
    select id into v_uid
    from auth.users
    where lower(email) = lower(v_person.email)
    limit 1;
    if v_uid is not null then
      insert into profiles (id, church_id, person_id, role)
      values (v_uid, v_person.church_id, p_person_id, p_level)
      on conflict (id) do update
        set role = excluded.role,
            person_id = excluded.person_id,
            church_id = excluded.church_id;
    end if;
  end if;

  -- Keep any profile already linked to this person in step (covers a profile
  -- created earlier under a different email).
  update profiles set role = p_level where person_id = p_person_id;
end
$$;

revoke execute on function public.set_app_access(uuid, text) from anon;
grant execute on function public.set_app_access(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Only staff may set app_access. RLS lets leaders insert people (newcomers
--    from check-in) but must not let them provision logins. SQL-editor and
--    service-role sessions (auth.uid() is null) bypass RLS and are trusted.
-- ---------------------------------------------------------------------------
create or replace function public.guard_app_access()
returns trigger language plpgsql security definer set search_path = public as
$$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.app_access is distinct from 'none' and not public.is_staff() then
      new.app_access := 'none';
    end if;
  else
    if new.app_access is distinct from old.app_access and not public.is_staff() then
      new.app_access := old.app_access;
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists people_guard_app_access on people;
create trigger people_guard_app_access
  before insert or update on people
  for each row execute function public.guard_app_access();

-- ---------------------------------------------------------------------------
-- 4. No person record → no login. (Was: on delete set null, which left the
--    profile alive with its role.)
-- ---------------------------------------------------------------------------
alter table profiles drop constraint if exists profiles_person_id_fkey;
alter table profiles
  add constraint profiles_person_id_fkey
  foreign key (person_id) references people(id) on delete cascade;

notify pgrst, 'reload schema';

-- Self-check: expect memberships_active_unique, set_app_access, and the
-- guard trigger to all be present.
select 'index' as kind, indexname as name from pg_indexes
  where tablename = 'memberships' and indexname = 'memberships_active_unique'
union all
select 'function', proname from pg_proc where proname = 'set_app_access'
union all
select 'trigger', tgname from pg_trigger where tgname = 'people_guard_app_access';
