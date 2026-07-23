-- ============================================================================
-- Access requests: nobody waits in silence. Run once in the Supabase SQL
-- Editor. Safe to re-run.
--
-- Two dead ends existed with no way out except the person tracking down staff
-- in the hallway:
--   * they sign in and have no access at all (app_access still 'none'), or
--   * they have access but no leadership seat on a roster, so check-in is shut.
-- Both now record a request, which the app emails to the church's admins once.
--
-- WHO GETS THE MAIL is decided server-side from churches.settings.accessAlerts
-- (admin person ids + extra addresses), never from the browser - the same rule
-- the check-in report follows, so a client can't aim mail at an arbitrary
-- inbox. With nothing configured it falls back to everyone with Staff access,
-- so it works the day you run this.
--
-- Requests are deduplicated: one OPEN request per person per kind. Reloading
-- the page, or signing in again next week, will not re-send.
-- ============================================================================

create table if not exists access_requests (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references churches(id) on delete cascade,
  email        text not null,
  kind         text not null default 'no-access'
                 check (kind in ('no-access','no-group')),
  requested_at timestamptz not null default now(),
  notified_at  timestamptz,
  resolved_at  timestamptz,
  resolved_by  uuid references people(id) on delete set null
);

-- One open request per address per kind; resolved ones are history and may
-- repeat (someone can lose access and ask again months later).
create unique index if not exists access_requests_open_unique
  on access_requests (lower(email), kind) where resolved_at is null;

create index if not exists access_requests_church_idx
  on access_requests (church_id, resolved_at);

alter table access_requests enable row level security;

-- Staff read and resolve their church's queue. Inserts only ever happen
-- through request_app_access() below, which runs as definer - a stranded user
-- has no profile, so no policy could have let them write this row themselves.
drop policy if exists access_requests_staff on access_requests;
create policy access_requests_staff on access_requests for select
  using (church_id = public.current_church_id() and public.is_staff());
drop policy if exists access_requests_staff_update on access_requests;
create policy access_requests_staff_update on access_requests for update
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());

-- ---------------------------------------------------------------------------
-- Record a request for the CALLER. Returns 'created' the first time (the API
-- route only sends mail on that), 'existing' when one is already open.
-- ---------------------------------------------------------------------------
create or replace function public.request_app_access(p_kind text default 'no-access')
returns text language plpgsql security definer set search_path = public as
$$
declare
  v_uid    uuid := auth.uid();
  v_email  text;
  v_church uuid;
  v_rows   integer;
begin
  if v_uid is null then return 'not-signed-in'; end if;
  if p_kind not in ('no-access','no-group') then return 'bad-kind'; end if;

  select lower(trim(email)) into v_email from auth.users where id = v_uid;
  if v_email is null or v_email = '' then return 'no-email'; end if;

  -- Their own church when a profile exists. A stranded sign-in has none, so
  -- fall back to the church this deployment serves.
  select church_id into v_church from profiles where id = v_uid;
  if v_church is null then
    select id into v_church from churches order by created_at limit 1;
  end if;
  if v_church is null then return 'no-church'; end if;

  insert into access_requests (church_id, email, kind)
  values (v_church, v_email, p_kind)
  on conflict do nothing;

  get diagnostics v_rows = row_count;
  return case when v_rows > 0 then 'created' else 'existing' end;
end
$$;

revoke execute on function public.request_app_access(text) from anon;
grant execute on function public.request_app_access(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Stamp notified_at once the mail is away, so the queue shows what actually
-- went out rather than what we hoped went out. It can only ever touch the
-- CALLER's own request - the address comes from their token, not an argument -
-- so the worst a caller can do is lie about their own row. The API route calls
-- it right after Resend accepts.
-- ---------------------------------------------------------------------------
create or replace function public.mark_access_request_notified(p_kind text)
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_email text;
begin
  if auth.uid() is null then return; end if;
  select lower(trim(email)) into v_email from auth.users where id = auth.uid();
  update access_requests
     set notified_at = now()
   where lower(email) = v_email and kind = p_kind and resolved_at is null;
end
$$;

revoke execute on function public.mark_access_request_notified(text) from anon;
grant execute on function public.mark_access_request_notified(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Granting access closes the loop: whatever they were waiting on is done, so
-- the request drops off the queue without anyone remembering to tick it.
-- (Same body as migration-ship-blockers, plus the resolve at the end.)
-- ---------------------------------------------------------------------------
create or replace function public.set_app_access(p_person_id uuid, p_level text)
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_person people%rowtype;
  v_uid    uuid;
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

  if v_person.email is not null then
    select id into v_uid
    from auth.users
    where lower(trim(email)) = lower(trim(v_person.email))
    limit 1;
    if v_uid is not null then
      -- Refuse when that login already belongs to SOMEONE ELSE. Duplicate
      -- emails across two person records are ordinary church-database mess,
      -- and without this the second grant silently repoints the first
      -- person's profile - demoting a staff member to leader, and pointing
      -- their "me" at a stranger. Fix the duplicate, don't paper over it.
      if exists (
        select 1 from profiles
        where id = v_uid
          and person_id is not null
          and person_id <> p_person_id
      ) then
        raise exception
          'That email already signs in as a different person. Two person records share %, so fix the duplicate before granting access.',
          v_person.email;
      end if;

      insert into profiles (id, church_id, person_id, role)
      values (v_uid, v_person.church_id, p_person_id, p_level)
      on conflict (id) do update
        set role      = excluded.role,
            person_id = excluded.person_id,
            church_id = excluded.church_id;
    end if;

    -- Their "I can't get in" request is answered.
    update access_requests
       set resolved_at = now(), resolved_by = p_person_id
     where church_id = v_person.church_id
       and kind = 'no-access'
       and resolved_at is null
       and lower(email) = lower(trim(v_person.email));
  end if;

  update profiles set role = p_level where person_id = p_person_id;
end
$$;

-- ---------------------------------------------------------------------------
-- The 'no-group' half closes itself too. Granting access resolves 'no-access'
-- (above), but the fix for "no lifegroup" is a roster change, which no RPC
-- sees - so without this the queue would fill with entries staff cleared
-- weeks ago and had to remember to tick off. Over-resolving is harmless and
-- self-correcting: if they still can't check in, their next visit files a
-- fresh request.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_no_group_request()
returns trigger language plpgsql security definer set search_path = public as
$$
declare
  v_email text;
begin
  select lower(trim(email)) into v_email from people where id = new.person_id;
  if v_email is null or v_email = '' then return new; end if;
  update access_requests
     set resolved_at = now(), resolved_by = new.person_id
   where kind = 'no-group'
     and resolved_at is null
     and lower(email) = v_email;
  return new;
end
$$;

drop trigger if exists memberships_resolve_request on memberships;
create trigger memberships_resolve_request
  after insert or update on memberships
  for each row execute function public.resolve_no_group_request();

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Self-check: expect the table, both RPCs, and any open requests already
-- waiting (there will be none on a fresh install).
-- ---------------------------------------------------------------------------
select 'table' as kind, 'access_requests' as name,
  case when to_regclass('public.access_requests') is not null
    then '✅ present' else '❌ missing' end as status
union all
select 'function', proname, '✅ present' from pg_proc
  where proname in ('request_app_access','mark_access_request_notified')
union all
select 'open request', email, kind || ' since ' || requested_at::date
  from access_requests where resolved_at is null;
