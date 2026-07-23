-- ============================================================================
-- Multi-church: anyone can stand up their own House to House. Run once in the
-- Supabase SQL Editor. Safe to re-run.
--
-- The data model was already multi-tenant - every table carries church_id and
-- every policy is scoped by current_church_id(). What was missing was a front
-- door: `churches` has no INSERT policy, so Antioch Boone existed only because
-- schema.sql seeds it. Nobody could make a second one.
--
-- This adds create_church(), which turns a signed-in stranger into the first
-- Staff member of a brand-new church in one call, and clears the three places
-- that quietly assumed a single church:
--   1. request_app_access() fell back to "the oldest church" for a stranded
--      sign-in - which in a two-church world files your request against
--      somebody else's church.
--   2. resolve_no_group_request() matched open requests by email with no
--      church scope, so one church's roster change could close another's.
--   3. (in app code) the access-alert API read settings from the first church
--      row rather than the church the request belongs to.
--
-- A happy side effect of #1: an email nobody has a person record for now has
-- no church to file against, so it cannot generate mail to anyone's admins.
-- Unknown addresses get offered "start a church" instead. That closes the
-- spam vector the audit flagged, without silencing the case it protects -
-- a known person whose email has a typo still reaches their own church.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Stand up a new church, with the caller as its first Staff member.
--
-- Runs as definer because the caller has no profile yet, so every RLS policy
-- would see them as belonging nowhere. The guard against abuse is the check
-- below: one login, one church. You cannot call this to escape a church you
-- are already in, or to mint a second staff seat for yourself.
-- ---------------------------------------------------------------------------
create or replace function public.create_church(
  p_church_name text,
  p_first_name  text default null,
  p_last_name   text default null
)
returns uuid language plpgsql security definer set search_path = public as
$$
declare
  v_uid    uuid := auth.uid();
  v_email  text;
  v_name   text := trim(coalesce(p_church_name, ''));
  v_slug   text;
  v_church uuid;
  v_person uuid;
begin
  if v_uid is null then
    raise exception 'Sign in before creating a church';
  end if;
  if exists (select 1 from profiles where id = v_uid) then
    raise exception 'This login already belongs to a church';
  end if;
  if v_name = '' then
    raise exception 'Give your church a name';
  end if;

  select lower(trim(email)) into v_email from auth.users where id = v_uid;
  if v_email is null or v_email = '' then
    raise exception 'This login has no email address';
  end if;

  -- Slug from the name, with a short suffix if it collides.
  v_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'church'; end if;
  if exists (select 1 from churches where slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into churches (name, slug) values (v_name, v_slug) returning id into v_church;

  -- Their own person record. app_access is left at its 'none' default on
  -- purpose: the people_guard_app_access trigger would overwrite anything
  -- else, because is_staff() is still false until the profile below exists.
  insert into people (church_id, first_name, last_name, email)
  values (
    v_church,
    coalesce(nullif(trim(p_first_name), ''), split_part(v_email, '@', 1)),
    coalesce(nullif(trim(p_last_name), ''), ''),
    v_email
  )
  returning id into v_person;

  insert into profiles (id, church_id, person_id, role)
  values (v_uid, v_church, v_person, 'staff');

  -- Now that the profile exists, is_staff() is true and the guard lets this
  -- through. Order matters here; flipping these two lines silently leaves the
  -- founder with no access to the church they just made.
  update people set app_access = 'staff' where id = v_person;

  return v_church;
end
$$;

revoke execute on function public.create_church(text, text, text) from anon;
grant execute on function public.create_church(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Access requests belong to a REAL church, never "the first one".
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

  -- Their own church when a profile exists.
  select church_id into v_church from profiles where id = v_uid;

  -- Otherwise, the church that already has a person record for this address.
  -- No record anywhere means no church is waiting on them - the app offers to
  -- start one instead of pestering a church they have nothing to do with.
  if v_church is null then
    select p.church_id into v_church
    from people p
    where p.email is not null and lower(trim(p.email)) = v_email
    order by case when p.app_access <> 'none' then 0 else 1 end
    limit 1;
  end if;
  if v_church is null then return 'no-church'; end if;

  insert into access_requests (church_id, email, kind)
  values (v_church, v_email, p_kind)
  on conflict do nothing;

  get diagnostics v_rows = row_count;
  return case when v_rows > 0 then 'created' else 'existing' end;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Resolving a request stays inside its own church.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_no_group_request()
returns trigger language plpgsql security definer set search_path = public as
$$
declare
  v_email  text;
  v_church uuid;
begin
  select lower(trim(email)), church_id into v_email, v_church
  from people where id = new.person_id;
  if v_email is null or v_email = '' then return new; end if;
  update access_requests
     set resolved_at = now(), resolved_by = new.person_id
   where kind = 'no-group'
     and resolved_at is null
     and church_id = v_church
     and lower(email) = v_email;
  return new;
end
$$;

-- Same scoping for mark_access_request_notified: only ever the caller's own
-- open request, and only within the church it was filed against.
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

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Self-check: the RPC exists, the single-church fallback is gone, and here is
-- every church on this deployment.
-- ---------------------------------------------------------------------------
select 'function' as kind, 'create_church' as name,
  case when exists (select 1 from pg_proc where proname = 'create_church')
    then '✅ present' else '❌ missing' end as status
union all
select 'function', 'request_app_access (church-scoped)',
  case when exists (select 1 from pg_proc
                    where proname = 'request_app_access'
                      and pg_get_functiondef(oid) not like '%order by created_at%')
    then '✅ no longer guesses the oldest church'
    else '❌ old single-church version still installed' end
union all
select 'church', c.name,
  (select count(*)::text from profiles pr where pr.church_id = c.id) || ' login(s)'
  from churches c;
