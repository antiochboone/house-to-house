-- ============================================================================
-- Sign-in repair. Run once in the Supabase SQL Editor. Safe to re-run.
--
-- THE BUG: a signed-in user with no `profiles` row sees an EMPTY church. Every
-- RLS policy is gated on current_church_id(), which reads profiles for
-- auth.uid() — no profile means every table returns zero rows, and the map
-- falls through to its "Welcome home, the church is empty" state. The person
-- is signed in; they just can't see anything.
--
-- A profile was only ever created in two places:
--   1. the on_auth_user_created trigger — fires ONLY when the auth account is
--      created, and only if a people row with that email already had
--      app_access of 'leader'/'staff' at that moment;
--   2. set_app_access(), when staff save App access in the person editor.
--
-- So anyone who typed their email at the sign-in screen BEFORE staff granted
-- them access got an auth account with no profile, and no later sign-in ever
-- fixed it — the trigger never fires again. Same dead end for anyone whose
-- access was set by direct SQL, or before migration-ship-blockers.sql existed.
--
-- THE FIX:
--   1. link_my_profile() — a self-heal RPC the app calls whenever it finds a
--      signed-in user with no profile. It grants exactly what staff already
--      set on the person record (nothing if that's 'none'), so it can't hand
--      out access nobody granted.
--   2. handle_new_user() hardened: trims whitespace around emails before
--      matching, so a stray space on a person record no longer strands them.
--   3. A one-time backfill for everyone already stranded.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Self-heal on sign-in. Returns a short status string the app can log.
--    Security: reads app_access from the person record — the value only staff
--    can write (people_guard_app_access) — and only ever touches the CALLER's
--    own profile row. Same authority as the sign-in trigger, just re-runnable.
-- ---------------------------------------------------------------------------
create or replace function public.link_my_profile()
returns text language plpgsql security definer set search_path = public as
$$
declare
  v_uid    uuid := auth.uid();
  v_email  text;
  v_person people%rowtype;
  v_have   profiles%rowtype;
begin
  if v_uid is null then
    return 'not-signed-in';
  end if;

  select lower(trim(email)) into v_email from auth.users where id = v_uid;
  if v_email is null or v_email = '' then
    return 'no-email-on-login';
  end if;

  select * into v_have from profiles where id = v_uid;
  if found and v_have.person_id is not null then
    return 'already-linked';
  end if;

  -- Prefer a staff grant when an email somehow lands on two person records.
  select * into v_person
  from people
  where email is not null
    and lower(trim(email)) = v_email
    and app_access in ('leader','staff')
  order by case when app_access = 'staff' then 0 else 1 end
  limit 1;

  if not found then
    -- Either no person record carries this email, or staff haven't granted
    -- them access yet. Both are for a human to fix; don't invent access.
    return 'no-access-granted';
  end if;

  insert into profiles (id, church_id, person_id, role)
  values (v_uid, v_person.church_id, v_person.id, v_person.app_access)
  on conflict (id) do update
    set church_id = excluded.church_id,
        person_id = excluded.person_id,
        role      = excluded.role;

  return 'linked';
end
$$;

revoke execute on function public.link_my_profile() from anon;
grant execute on function public.link_my_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Sign-in trigger: same matching rules as the RPC (trim + staff first), so
--    the two can't disagree about who a login belongs to.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
declare
  v_person people%rowtype;
begin
  select * into v_person
  from people
  where email is not null
    and lower(trim(email)) = lower(trim(new.email))
    and app_access in ('leader','staff')
  order by case when app_access = 'staff' then 0 else 1 end
  limit 1;
  if found then
    insert into profiles (id, church_id, person_id, role)
    values (new.id, v_person.church_id, v_person.id, v_person.app_access)
    on conflict (id) do nothing;
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Backfill: connect every existing login that a grant already covers.
--    Fixes the people who are stranded right now without them doing anything.
-- ---------------------------------------------------------------------------
insert into profiles (id, church_id, person_id, role)
select distinct on (au.id) au.id, p.church_id, p.id, p.app_access
from auth.users au
join people p
  on p.email is not null
 and lower(trim(p.email)) = lower(trim(au.email))
 and p.app_access in ('leader','staff')
order by au.id, case when p.app_access = 'staff' then 0 else 1 end
on conflict (id) do update
  set church_id = excluded.church_id,
      person_id = excluded.person_id,
      role      = excluded.role
where profiles.person_id is null;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Self-check. Row 1: the RPC exists. Rows 2+: every login and whether it can
-- now see the app. Anyone still listed as STRANDED needs a human decision —
-- grant them access in the person editor, or fix the email on their record.
-- ---------------------------------------------------------------------------
select 'function' as kind, proname as detail, '✅ present' as status
from pg_proc where proname = 'link_my_profile'
union all
select
  'login',
  au.email,
  case
    when pr.id is null then '❌ STRANDED — no profile (grant App access, or fix the email on their person record)'
    when pr.person_id is null then '❌ STRANDED — profile not linked to a person'
    else '✅ ' || pr.role
  end
from auth.users au
left join profiles pr on pr.id = au.id
order by 1, 2;
