-- ============================================================================
-- Self-service join: a link you send to leaders instead of typing their email
-- yourself. Run once in the Supabase SQL Editor. Safe to re-run.
--
-- THE FLOW: a leader opens /join, picks the lifegroup they lead, and verifies
-- their email. That files a 'join' access request carrying their name and which
-- group they said they lead. Staff approve it from the same queue they already
-- use - one click grants Leader access AND seats them on that group's roster.
--
-- NOBODY gets in without approval: a join request grants nothing on its own.
-- app_access stays 'none' until a staff member approves. This just replaces the
-- manual "type their email, grant access, invite" dance with a request that
-- lands in the queue on its own.
--
-- THE MERGE CASE (why approval isn't fully automatic): a member who gets asked
-- to lead already has a person record. Blindly creating a second would fork
-- their history. So a join request also carries a likely-match (same email in
-- the church), and approval lets staff either grant that existing person
-- access or create a new one.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Richer access requests. The passive kinds ('no-access' / 'no-group') use
--    none of these; a 'join' fills them in.
-- ---------------------------------------------------------------------------
alter table access_requests add column if not exists first_name text;
alter table access_requests add column if not exists last_name text;
alter table access_requests add column if not exists requested_group_id uuid
  references groups(id) on delete set null;
alter table access_requests add column if not exists requested_group_note text;
alter table access_requests add column if not exists matched_person_id uuid
  references people(id) on delete set null;

alter table access_requests drop constraint if exists access_requests_kind_check;
alter table access_requests
  add constraint access_requests_kind_check check (kind in ('no-access','no-group','join'));

-- ---------------------------------------------------------------------------
-- 2. The public directory the join page reads: church name + its group names,
--    by slug. Anon-callable BY DESIGN - it's how an unauthenticated visitor
--    fills the "which lifegroup?" dropdown. Exposes only names of active
--    groups for a slug someone already has; nothing else, and no way to list
--    all churches. With no slug it returns the sole church (the common case
--    while there's just one), so a bare /join link works.
-- ---------------------------------------------------------------------------
create or replace function public.church_directory(p_slug text default null)
returns json language sql stable security definer set search_path = public as
$$
  select json_build_object(
    'name', c.name,
    'slug', c.slug,
    'groups', coalesce((
      select json_agg(json_build_object('id', g.id, 'name', g.name) order by g.name)
      from groups g
      where g.church_id = c.id and g.status <> 'dissolved'
    ), '[]'::json)
  )
  from churches c
  where (p_slug is not null and c.slug = p_slug)
     or (p_slug is null and (select count(*) from churches) = 1);
$$;

revoke execute on function public.church_directory(text) from public;
grant execute on function public.church_directory(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. File a join request for the SIGNED-IN caller. Authenticated only - the
--    magic-link sign-in is what verifies the email, so we trust auth.uid()'s
--    address rather than anything typed. No person record is created here;
--    that (and any merge) is decided at approval, so a self-service signup can
--    never mint a duplicate person on its own.
-- ---------------------------------------------------------------------------
create or replace function public.request_to_join(
  p_slug       text,
  p_first      text,
  p_last       text,
  p_group_id   uuid default null,
  p_group_note text default null
)
returns text language plpgsql security definer set search_path = public as
$$
declare
  v_uid    uuid := auth.uid();
  v_email  text;
  v_church uuid;
  v_match  uuid;
begin
  if v_uid is null then return 'not-signed-in'; end if;
  select lower(trim(email)) into v_email from auth.users where id = v_uid;
  if v_email is null or v_email = '' then return 'no-email'; end if;

  select id into v_church from churches
  where (p_slug is not null and slug = p_slug)
     or (p_slug is null and (select count(*) from churches) = 1)
  limit 1;
  if v_church is null then return 'no-church'; end if;

  -- Already fully set up in this church? Nothing to request.
  if exists (select 1 from profiles where id = v_uid and church_id = v_church) then
    return 'already-member';
  end if;

  -- Ignore a group id that isn't really in this church.
  if p_group_id is not null
     and not exists (select 1 from groups where id = p_group_id and church_id = v_church) then
    p_group_id := null;
  end if;

  -- Likely existing person: same email in this church (the "member asked to
  -- lead" case). Staff decide at approval whether it's really them.
  select id into v_match
  from people
  where church_id = v_church and email is not null and lower(trim(email)) = v_email
  order by case when app_access <> 'none' then 0 else 1 end
  limit 1;

  -- One open join request per email; a re-submit updates the answers quietly
  -- (no second notification).
  update access_requests set
    requested_group_id   = p_group_id,
    requested_group_note = nullif(trim(p_group_note), ''),
    first_name           = nullif(trim(p_first), ''),
    last_name            = nullif(trim(p_last), ''),
    matched_person_id    = v_match
  where church_id = v_church and kind = 'join'
    and resolved_at is null and lower(email) = v_email;
  if found then return 'existing'; end if;

  insert into access_requests
    (church_id, email, kind, first_name, last_name,
     requested_group_id, requested_group_note, matched_person_id)
  values
    (v_church, v_email, 'join', nullif(trim(p_first), ''), nullif(trim(p_last), ''),
     p_group_id, nullif(trim(p_group_note), ''), v_match);
  return 'created';
end
$$;

revoke execute on function public.request_to_join(text, text, text, uuid, text) from anon;
grant execute on function public.request_to_join(text, text, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Approve a join request. Staff only. p_person_id null = create a new
--    person; non-null = grant that existing person (the merge). Either way:
--    grant Leader, seat them on the group they named, and resolve every open
--    request for that email so the queue clears.
-- ---------------------------------------------------------------------------
create or replace function public.approve_join_request(
  p_request_id uuid,
  p_person_id  uuid default null
)
returns uuid language plpgsql security definer set search_path = public as
$$
declare
  r        access_requests%rowtype;
  v_church uuid := public.current_church_id();
  v_person uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff can approve join requests';
  end if;
  select * into r from access_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if r.church_id is distinct from v_church then
    raise exception 'That request belongs to another church';
  end if;

  if p_person_id is not null then
    select id into v_person from people
    where id = p_person_id and church_id = v_church;
    if v_person is null then raise exception 'Person not found in this church'; end if;
    -- Make sure the login can link: the sign-in identity is the request email.
    update people set email = coalesce(nullif(trim(email), ''), r.email)
    where id = v_person;
  else
    insert into people (church_id, first_name, last_name, email)
    values (
      v_church,
      coalesce(nullif(trim(r.first_name), ''), split_part(r.email, '@', 1)),
      coalesce(nullif(trim(r.last_name), ''), ''),
      r.email
    )
    returning id into v_person;
  end if;

  -- Grants Leader, links their auth account, and resolves 'no-access' requests.
  perform public.set_app_access(v_person, 'leader');

  -- Seat them on the group they said they lead, as a leader.
  if r.requested_group_id is not null then
    if exists (
      select 1 from memberships
      where person_id = v_person and group_id = r.requested_group_id and left_at is null
    ) then
      update memberships set role = 'leader'
      where person_id = v_person and group_id = r.requested_group_id and left_at is null;
    else
      insert into memberships (church_id, person_id, group_id, role)
      values (v_church, v_person, r.requested_group_id, 'leader');
    end if;
  end if;

  -- Clear this and any sibling requests for the same address.
  update access_requests set resolved_at = now(), resolved_by = v_person
  where church_id = v_church and lower(email) = lower(r.email) and resolved_at is null;

  return v_person;
end
$$;

revoke execute on function public.approve_join_request(uuid, uuid) from anon;
grant execute on function public.approve_join_request(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Self-check: the three functions and the new columns.
-- ---------------------------------------------------------------------------
select 'function' as kind, proname as name, '✅ present' as status
from pg_proc where proname in ('church_directory','request_to_join','approve_join_request')
union all
select 'column', column_name, '✅ present'
from information_schema.columns
where table_name = 'access_requests'
  and column_name in ('requested_group_id','matched_person_id','first_name')
order by 1, 2;
