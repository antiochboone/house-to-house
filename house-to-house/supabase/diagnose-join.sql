-- ============================================================================
-- "Someone used the join link and nothing happened." Read-only; safe anytime.
--
-- Answers, in order:
--   1. Did migration-join-requests.sql actually run? (If not, the join page
--      can't file anything AND the Settings queue silently shows empty.)
--   2. Did their sign-up reach the database at all?
--   3. If it did, who WOULD have been emailed about it?
--
-- Put the address they signed up with in the first line, then Run.
-- ============================================================================

with target as (select lower(trim('REPLACE-WITH-THEIR-EMAIL')) as email),

-- 1. Is the migration in place?
migration as (
  select
    (select count(*) from pg_proc
      where proname in ('church_directory','request_to_join','approve_join_request')) as fns,
    (select count(*) from information_schema.columns
      where table_name='access_requests'
        and column_name in ('first_name','requested_group_id','matched_person_id')) as cols
),

-- 2. What actually exists for this person?
login as (
  select au.id, au.email, au.created_at, au.last_sign_in_at
  from auth.users au, target t
  where lower(trim(au.email)) = t.email
  limit 1
),
req as (
  select ar.* from access_requests ar, target t
  where lower(ar.email) = t.email
  order by ar.requested_at desc
  limit 1
),

-- 3. Who would get the alert? Named admins if the church set any, otherwise
--    everyone who counts as staff. NOTE: staff-ness is app_access on the
--    person record OR role on their login - an account set up before
--    app_access existed can be staff by profile alone.
cfg as (
  select coalesce(c.settings->'accessAlerts', '{}'::jsonb) as a, c.id as church_id
  from churches c
  order by c.created_at
  limit 1
),
named as (
  select p.email
  from cfg, jsonb_array_elements_text(coalesce(cfg.a->'admins','[]'::jsonb)) aid
  join people p on p.id = aid::uuid
  where p.email is not null and trim(p.email) <> ''
),
extra as (
  select jsonb_array_elements_text(coalesce(cfg.a->'extra','[]'::jsonb)) as email from cfg
),
fallback as (
  select distinct p.email
  from people p
  left join profiles pr on pr.person_id = p.id
  where p.email is not null and trim(p.email) <> ''
    and (p.app_access = 'staff' or pr.role = 'staff')
),
recipients as (
  select email from named
  union select email from extra
  union select email from fallback
  where not exists (select 1 from named) and not exists (select 1 from extra)
)

select
  '1. migration' as step,
  case when (select fns from migration) = 3 and (select cols from migration) = 3
    then '✅ join migration is in place'
    else '❌ NOT RUN — run supabase/migration-join-requests.sql. Until you do, '
         || 'the join page cannot file requests and Settings shows an EMPTY queue '
         || '(found ' || (select fns from migration) || '/3 functions, '
         || (select cols from migration) || '/3 columns)'
  end as finding

union all select '2. their login',
  case when (select id from login) is null
    then '❌ no auth account for that address - they never finished the emailed link'
    else '✅ signed in ' || coalesce((select last_sign_in_at from login)::text, 'never')
  end

union all select '3. their request',
  case
    when (select id from req) is null
      then '❌ NO request row. Their answers never reached the database - either the '
           || 'migration is missing (see step 1), or they opened the email link in a '
           || 'DIFFERENT browser/device than they filled the form in (the answers are '
           || 'held in that browser until the link is clicked).'
    when (select kind from req) = 'join'
      then '✅ join request, filed ' || (select requested_at from req)::date
           || ', notified: ' || coalesce((select notified_at from req)::text, '❌ NEVER')
           || case when (select resolved_at from req) is not null
                then ' (already resolved)' else ' (open - should be in your queue)' end
    else '⚠️ a ' || (select kind from req) || ' request exists, not a join one. They '
         || 'likely landed on the generic access screen instead of completing the join.'
  end

union all select '4. alert recipients',
  case when (select count(*) from recipients) = 0
    then '❌ NOBODY would be emailed. Give at least one staff person an email on '
         || 'their person record, or add an address under Settings -> Access requests.'
    else '✅ would email: ' || (select string_agg(email, ', ') from recipients)
  end

union all select '5. email sending',
  '🔎 SQL cannot see this. In Vercel confirm RESEND_API_KEY, REPORT_FROM_EMAIL and '
  || 'SUPABASE_SERVICE_ROLE_KEY are set, then Redeploy. Without them requests still '
  || 'queue, but no mail goes out.'

order by step;
