-- ============================================================================
-- House to House — migration health check. Read-only; safe to run anytime.
--
-- Paste the whole thing into the Supabase SQL Editor and Run. You get one row
-- per migration/feature: ✅ = live, ❌ = that migration hasn't been run yet
-- (the row tells you which file to run). Env-var / dashboard items that SQL
-- can't see are listed at the bottom as manual checks.
-- ============================================================================

with checks as (

  -- 0. Base schema applied at all?
  select 0.0 as step, 'Base schema (people table)' as feature,
    case when to_regclass('public.people') is not null
      then '✅ present'
      else '❌ MISSING — run supabase/schema.sql first' end as status

  -- 1. App access (migration-app-access.sql)
  union all select 1.0, 'App access — people.app_access',
    case when exists (select 1 from information_schema.columns
                      where table_name='people' and column_name='app_access')
      then '✅ present' else '❌ MISSING — run migration-app-access.sql' end

  -- 2. Custom roles (migration-custom-roles.sql): leads_group honors settings
  union all select 2.0, 'Custom roles — leads_group honors settings',
    case when exists (select 1 from pg_proc
                      where proname='leads_group'
                        and pg_get_functiondef(oid) ilike '%leadershipRoleIds%')
      then '✅ present' else '❌ MISSING — run migration-custom-roles.sql' end

  -- 3. Ship-blocker fixes (migration-ship-blockers.sql) — 3 independent objects
  union all select 3.1, 'Ship fix A1 — memberships_active_unique index',
    case when exists (select 1 from pg_indexes where indexname='memberships_active_unique')
      then '✅ present' else '❌ MISSING — run migration-ship-blockers.sql' end
  union all select 3.2, 'Ship fix A3 — set_app_access() RPC',
    case when exists (select 1 from pg_proc where proname='set_app_access')
      then '✅ present' else '❌ MISSING — run migration-ship-blockers.sql' end
  union all select 3.3, 'Ship fix A4 — guard_app_access trigger',
    case when exists (select 1 from pg_trigger where tgname='people_guard_app_access')
      then '✅ present' else '❌ MISSING — run migration-ship-blockers.sql' end
  union all select 3.4, 'Ship fix B1 — profiles.person_id ON DELETE CASCADE',
    case when exists (select 1 from pg_constraint
                      where conname='profiles_person_id_fkey' and confdeltype='c')
      then '✅ present' else '❌ MISSING — run migration-ship-blockers.sql' end

  -- 3.5 Sign-in repair (migration-signin-repair.sql)
  union all select 3.5, 'Sign-in repair — link_my_profile() self-heal RPC',
    case when exists (select 1 from pg_proc where proname='link_my_profile')
      then '✅ present' else '❌ MISSING — run migration-signin-repair.sql' end
  union all select 3.6, 'Sign-in repair — every login connected to a person',
    case when not exists (
           select 1 from auth.users au
           left join profiles pr on pr.id = au.id
           where pr.person_id is null)
      then '✅ all logins linked'
      else '⚠️ ' || (select count(*)::text from auth.users au
                     left join profiles pr on pr.id = au.id
                     where pr.person_id is null)
           || ' login(s) see an empty app — run diagnose-signin.sql for each' end

  -- 3.7 Leaders edit their own roster (migration-leader-edit.sql)
  union all select 3.7, 'Leader edit — people/memberships update policies',
    case when (select count(*) from pg_policies
               where policyname in ('people_update_leader','memberships_update_leader')) = 2
      then '✅ present' else '❌ MISSING — run migration-leader-edit.sql' end
  union all select 3.8, 'Leader edit — email guard on accounts that can sign in',
    case when exists (select 1 from pg_proc where proname='guard_app_access'
                        and pg_get_functiondef(oid) like '%new.email := old.email%')
      then '✅ present' else '❌ MISSING — run migration-leader-edit.sql' end

  -- 3.9 Access requests (migration-access-requests.sql)
  union all select 3.9, 'Access requests — table + request_app_access() RPC',
    case when to_regclass('public.access_requests') is not null
          and exists (select 1 from pg_proc where proname='request_app_access')
      then '✅ present' else '❌ MISSING — run migration-access-requests.sql' end
  union all select 3.95, 'Access requests — anyone waiting right now',
    case when to_regclass('public.access_requests') is null then '⏭ n/a'
         when not exists (select 1 from access_requests where resolved_at is null)
      then '✅ nobody waiting'
      else '⚠️ ' || (select count(*)::text from access_requests where resolved_at is null)
           || ' waiting — see Settings → Access requests' end

  -- 4. D-groups (migration-dgroups.sql)
  union all select 4.0, 'D-groups — dgroups + dgroup_members tables',
    case when to_regclass('public.dgroups') is not null
          and to_regclass('public.dgroup_members') is not null
      then '✅ present' else '❌ MISSING — run migration-dgroups.sql' end

  -- 5. Church-wide D-groups (migration-dgroups-churchwide.sql)
  union all select 5.0, 'Church-wide D-groups — dgroups.group_id nullable',
    case when exists (select 1 from information_schema.columns
                      where table_name='dgroups' and column_name='group_id'
                        and is_nullable='YES')
      then '✅ present'
      when to_regclass('public.dgroups') is null
        then '⏭ n/a — run migration-dgroups.sql first'
      else '❌ MISSING — run migration-dgroups-churchwide.sql' end

  -- 6. D-group kind (migration-dgroup-kind.sql)
  union all select 6.0, 'D-group kind — dgroups.kind (mentoring/peer)',
    case when exists (select 1 from information_schema.columns
                      where table_name='dgroups' and column_name='kind')
      then '✅ present'
      when to_regclass('public.dgroups') is null
        then '⏭ n/a — run migration-dgroups.sql first'
      else '❌ MISSING — run migration-dgroup-kind.sql' end

  -- 7. Discipleship Roadmap + peers (migration-roadmap.sql)
  union all select 7.0, 'Roadmap + peers — people.roadmap',
    case when exists (select 1 from information_schema.columns
                      where table_name='people' and column_name='roadmap')
      then '✅ present' else '❌ MISSING — run migration-roadmap.sql' end

  -- 8. Attendance (migration-attendance.sql)
  union all select 8.0, 'Attendance — checkins.attendance',
    case when exists (select 1 from information_schema.columns
                      where table_name='checkins' and column_name='attendance')
      then '✅ present' else '❌ MISSING — run migration-attendance.sql' end

  -- 9. MVP board + reminders config (migration-mvp-reminders.sql) — 3 objects
  union all select 9.1, 'MVP board — guests.group_id',
    case when exists (select 1 from information_schema.columns
                      where table_name='guests' and column_name='group_id')
      then '✅ present' else '❌ MISSING — run migration-mvp-reminders.sql' end
  union all select 9.2, 'MVP board — leader-select policy on guests',
    case when exists (select 1 from pg_policies where policyname='guests_select_leader')
      then '✅ present' else '❌ MISSING — run migration-mvp-reminders.sql' end
  union all select 9.3, 'Reminders — groups.reminder config column',
    case when exists (select 1 from information_schema.columns
                      where table_name='groups' and column_name='reminder')
      then '✅ present' else '❌ MISSING — run migration-mvp-reminders.sql' end

  -- 10. Reminder cron infrastructure (setup-reminder-cron.sql)
  union all select 10.1, 'Reminders — pg_cron extension',
    case when exists (select 1 from pg_extension where extname='pg_cron')
      then '✅ present' else '❌ MISSING — run setup-reminder-cron.sql' end
  union all select 10.2, 'Reminders — pg_net extension',
    case when exists (select 1 from pg_extension where extname='pg_net')
      then '✅ present' else '❌ MISSING — run setup-reminder-cron.sql' end

  -- --- Manual checks SQL can't see (informational) ---
  union all select 20.1, 'MANUAL — Vercel env: RESEND_API_KEY + REPORT_FROM_EMAIL',
    '🔎 check in Vercel (report + reminder emails need these)'
  union all select 20.2, 'MANUAL — Vercel env: CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY',
    '🔎 check in Vercel (reminder cron needs these), then Redeploy'
  union all select 20.3, 'MANUAL — cron job scheduled',
    '🔎 if pg_cron is ✅ above, run:  select jobname, schedule from cron.job;'
  union all select 20.4, 'MANUAL — Supabase Auth: Reset Password template + OTP expiry',
    '🔎 check in Supabase → Authentication (template set; expiry raised to ~24h)'
)
select
  to_char(step, 'FM990.0') as "#",
  feature,
  status
from checks
order by step;
