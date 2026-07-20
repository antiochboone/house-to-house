-- ============================================================================
-- App access: staff explicitly grant who can sign in (and at what level).
-- Storing someone's email no longer grants access on its own. Run once in
-- the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- 1. Per-person access level, provisioned by staff.
alter table people
  add column if not exists app_access text not null default 'none';
alter table people drop constraint if exists people_app_access_check;
alter table people
  add constraint people_app_access_check check (app_access in ('none','leader','staff'));

-- 2. Preserve access for anyone who already has a login, so nobody is locked
--    out: mirror their current profile role onto their person record.
update people p
set app_access = pr.role
from profiles pr
where pr.person_id = p.id
  and pr.role in ('leader','staff')
  and p.app_access = 'none';

-- 3. Sign-in now grants exactly the access staff set (and nothing if 'none').
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
declare
  v_person people%rowtype;
begin
  select * into v_person
  from people
  where email is not null and lower(email) = lower(new.email)
    and app_access in ('leader','staff')
  limit 1;
  if found then
    insert into profiles (id, church_id, person_id, role)
    values (new.id, v_person.church_id, v_person.id, v_person.app_access)
    on conflict (id) do nothing;
  end if;
  return new;
end
$$;

notify pgrst, 'reload schema';

-- Self-check: should list the app_access column.
select column_name, data_type
from information_schema.columns
where table_name = 'people' and column_name = 'app_access';
