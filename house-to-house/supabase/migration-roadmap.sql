-- ============================================================================
-- Discipleship Roadmap + peer discipleship. Run once in the Supabase SQL
-- Editor. Safe to re-run.
--
-- 1. Per-person Roadmap: the formation ladder (testimony shared, baptized,
--    Holy Spirit, membership, made their first disciple). Stored as a jsonb
--    map of step-key -> completion date, e.g. {"baptized":"2026-04-15"}.
--    Which steps exist (and their labels) is church-configurable in
--    churches.settings.roadmap.
--
-- 2. Peer discipleship needs NO schema change — discipleship_relationships
--    already has a `kind` column checking ('mentoring','peer'). The app just
--    wasn't reading or writing it. (Confirm the check is present below.)
-- ============================================================================

alter table people
  add column if not exists roadmap jsonb not null default '{}'::jsonb;

-- Belt-and-suspenders: make sure the relationship kind check allows 'peer'
-- (it does in the base schema; this only re-asserts it for older projects).
alter table discipleship_relationships
  drop constraint if exists discipleship_relationships_kind_check;
alter table discipleship_relationships
  add constraint discipleship_relationships_kind_check
  check (kind in ('mentoring','peer'));

notify pgrst, 'reload schema';

-- Self-check: expect the roadmap column and the kind check to be present.
select column_name from information_schema.columns
  where table_name = 'people' and column_name = 'roadmap';
