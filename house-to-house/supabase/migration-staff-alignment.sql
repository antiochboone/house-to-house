-- ============================================================================
-- Make the database agree with the app about who is staff. Run once in the
-- Supabase SQL Editor. Safe to re-run.
--
-- THE BUG: two records say whether you're staff, and only one of them counted.
--
--   * people.app_access - what staff set in the person editor ("App access")
--   * profiles.role     - stamped onto your login when it was created/linked
--
-- The APP treats you as staff if EITHER says so (deliberately: a fresh grant
-- hasn't re-stamped the profile yet, and accounts created before app_access
-- existed never had it backfilled). But is_staff() - which every staff-only
-- RLS policy is built on - only ever read profiles.role.
--
-- The result is the worst kind of failure: you see the entire staff interface,
-- and every protected read silently returns nothing. An access-request queue
-- with someone waiting in it renders as empty. No error, anywhere.
--
-- THE FIX: is_staff() now honors either signal, matching the app exactly. This
-- is not a widening of trust - people.app_access is already staff-only to
-- write (people_guard_app_access), so anyone it calls staff was made staff by
-- a staff member.
--
-- Then a backfill re-stamps profiles.role so the two agree going forward.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. One definition of staff, matching the app's.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as
$$
  select exists (
    select 1
    from profiles pr
    left join people p on p.id = pr.person_id
    where pr.id = auth.uid()
      and (pr.role = 'staff' or p.app_access = 'staff')
  )
$$;

-- ---------------------------------------------------------------------------
-- 2. Re-stamp any profile that disagrees with its person record, so the two
--    signals stop drifting. app_access is the one staff actually edit, so it
--    wins.
-- ---------------------------------------------------------------------------
update profiles pr
set role = p.app_access
from people p
where p.id = pr.person_id
  and p.app_access in ('leader','staff')
  and pr.role is distinct from p.app_access;

-- ---------------------------------------------------------------------------
-- 3. Let the app ask the database "do YOU think I'm staff?". RLS denies by
--    returning zero rows, not an error, so a mismatch is otherwise invisible -
--    the queue just looks empty. With this the app can say so out loud.
-- ---------------------------------------------------------------------------
grant execute on function public.is_staff() to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Self-check. Row 1: the function honors both signals. Then every login, with
-- both signals side by side - they should now agree, and anyone reading
-- 'staff' can see the access-request queue.
-- ---------------------------------------------------------------------------
select 'function' as kind, 'is_staff' as who,
  case when exists (select 1 from pg_proc
                    where proname = 'is_staff'
                      and pg_get_functiondef(oid) like '%app_access%')
    then '✅ honors both app_access and profiles.role'
    else '❌ old version still installed' end as status
union all
select 'login', au.email,
  'profile: ' || coalesce(pr.role, '-') ||
  ' / person: ' || coalesce(p.app_access, '-') ||
  case when pr.role = 'staff' or p.app_access = 'staff'
    then '  → ✅ staff (sees the queue)'
    else '  → leader' end
from auth.users au
join profiles pr on pr.id = au.id
left join people p on p.id = pr.person_id
order by 1, 2;
