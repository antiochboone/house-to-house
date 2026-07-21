-- ============================================================================
-- Attendance on check-ins. Run once in the Supabase SQL Editor. Safe to re-run.
--
-- "Who came tonight?" — the check-in now records who was there as an array of
-- person ids, tapped from the roster instead of typed. Powers the "N came"
-- line on recent check-ins and (later) attendance-informed engagement tiers.
-- ============================================================================

alter table checkins
  add column if not exists attendance uuid[] not null default '{}';

notify pgrst, 'reload schema';

-- Self-check: should list the attendance column.
select column_name, data_type from information_schema.columns
where table_name = 'checkins' and column_name = 'attendance';
