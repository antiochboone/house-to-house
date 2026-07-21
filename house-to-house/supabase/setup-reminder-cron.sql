-- ============================================================================
-- Check-in reminder cron — EDIT THE SECRET BEFORE RUNNING.
--
-- Every hour, Postgres pings the app's /api/reminders route, which figures
-- out which groups just finished lifegroup (per their meeting day/time and
-- reminder frequency) and emails their configured recipients.
--
-- BEFORE running:
--   1. Replace CHANGE-ME-TO-A-LONG-RANDOM-STRING below with a secret of your
--      own (any long random string).
--   2. In Vercel → Settings → Environment Variables, add the SAME value as
--      CRON_SECRET, plus SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings →
--      API → service_role). Then redeploy.
--
-- Safe to re-run: scheduling under the same name replaces the old schedule.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'h2h-checkin-reminders',
  '5 * * * *', -- five past every hour
  $$
  select net.http_post(
    url := 'https://house-to-house.vercel.app/api/reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer CHANGE-ME-TO-A-LONG-RANDOM-STRING',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Self-check: the job should be listed.
select jobname, schedule from cron.job where jobname = 'h2h-checkin-reminders';
