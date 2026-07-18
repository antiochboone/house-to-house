-- ============================================================================
-- M3 migration: link logins to people, leader permissions for check-ins
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- When someone signs in for the first time, auto-create their profile by
-- matching their email to a person record (leaders get linked automatically —
-- no invite ceremony needed beyond entering their email on their person).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
declare
  v_person people%rowtype;
begin
  select * into v_person
  from people
  where email is not null and lower(email) = lower(new.email)
  limit 1;
  if found then
    insert into profiles (id, church_id, person_id, role)
    values (new.id, v_person.church_id, v_person.id, 'leader')
    on conflict (id) do nothing;
  end if;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: link already-signed-in users to their person by email (keeps role)
update profiles pr
set person_id = p.id
from auth.users u, people p
where pr.id = u.id
  and pr.person_id is null
  and p.email is not null
  and lower(p.email) = lower(u.email);

-- Leaders may update their own group (meeting day/time/place changes from check-in)
drop policy if exists groups_update_leader on groups;
create policy groups_update_leader on groups for update
  using (public.leads_group(id))
  with check (public.leads_group(id));

-- Leaders may add people (newcomers from check-in) and memberships for their group
drop policy if exists people_insert_leader on people;
create policy people_insert_leader on people for insert
  with check (church_id = public.current_church_id());
drop policy if exists memberships_insert_leader on memberships;
create policy memberships_insert_leader on memberships for insert
  with check (church_id = public.current_church_id() and public.leads_group(group_id));

-- Leaders may post wins
drop policy if exists wins_insert_leader on wins;
create policy wins_insert_leader on wins for insert
  with check (church_id = public.current_church_id());

notify pgrst, 'reload schema';

-- Self-check: should return the trigger name
select tgname from pg_trigger where tgname = 'on_auth_user_created';
