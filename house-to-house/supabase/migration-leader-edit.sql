-- ============================================================================
-- Leaders edit their own roster. Run once in the Supabase SQL Editor.
-- Safe to re-run.
--
-- Until now a leader could ADD a person to their group but not fix anything
-- afterwards - people_write and memberships_write are staff-only. Worse, an
-- update blocked by RLS returns no error and zero rows, so a leader editing a
-- name would have been told "saved" while nothing changed.
--
-- WHAT THIS GRANTS. A leader may update a person when BOTH hold:
--   * that person is on the active roster of a group the leader leads, and
--   * that person's app_access is 'none' - they cannot sign in.
--
-- WHY THE SECOND CONDITION. people.email is the sign-in identity: the
-- new-user trigger hands a fresh login whatever access the matching person
-- record carries. Without this restriction a leader could take any staff
-- member sitting on their roster (a very normal thing), change that person's
-- email to an address the leader controls, request a sign-in link, and be
-- minted a staff profile on first sign-in. So leaders edit ordinary members;
-- anyone who can sign in to the app stays staff's to manage.
--
-- Leaders also get UPDATE on memberships for groups they lead, which is what
-- makes "change their role" and "they're no longer in our group" work. They
-- still cannot delete a person, grant app access, or move someone into a
-- group they don't lead.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Edit people on a roster you lead - members only, never other logins.
-- ---------------------------------------------------------------------------
drop policy if exists people_update_leader on people;
create policy people_update_leader on people for update
  using (
    church_id = public.current_church_id()
    and app_access = 'none'
    and exists (
      select 1 from memberships m
      where m.person_id = people.id
        and m.left_at is null
        and public.leads_group(m.group_id)
    )
  )
  with check (
    church_id = public.current_church_id()
    and app_access = 'none'
  );

-- ---------------------------------------------------------------------------
-- 2. Edit memberships of groups you lead: role changes, and ending someone's
--    place on the roster. The with-check repeats leads_group so a membership
--    cannot be moved into a group the leader does not lead.
-- ---------------------------------------------------------------------------
drop policy if exists memberships_update_leader on memberships;
create policy memberships_update_leader on memberships for update
  using (church_id = public.current_church_id() and public.leads_group(group_id))
  with check (church_id = public.current_church_id() and public.leads_group(group_id));

-- ---------------------------------------------------------------------------
-- 3. Harden the people guard. It already kept app_access as staff's alone;
--    now it also freezes the email of anyone who can sign in, so the
--    escalation described above stays closed even if a future policy widens
--    who may update people. SQL-editor and service-role sessions
--    (auth.uid() is null) bypass this and are trusted.
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
  elsif not public.is_staff() then
    -- Who may sign in, and at what level, is staff's call alone.
    new.app_access := old.app_access;
    -- And so is the address they sign in WITH, once they have any access:
    -- repointing it at an address you control would hand you their level on
    -- that address's first sign-in.
    if old.app_access is distinct from 'none' then
      new.email := old.email;
    end if;
  end if;
  return new;
end
$$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Self-check: expect all three rows present.
-- ---------------------------------------------------------------------------
select 'policy' as kind, policyname as name, '✅ present' as status
  from pg_policies where policyname = 'people_update_leader'
union all
select 'policy', policyname, '✅ present'
  from pg_policies where policyname = 'memberships_update_leader'
union all
select 'trigger', tgname,
  case when pg_get_functiondef(p.oid) like '%new.email := old.email%'
    then '✅ email guard live' else '❌ old version still installed' end
  from pg_trigger t join pg_proc p on p.proname = 'guard_app_access'
  where tgname = 'people_guard_app_access';
