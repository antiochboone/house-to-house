-- ============================================================================
-- D-group kind: mentoring vs peer. Run once in the Supabase SQL Editor.
-- Safe to re-run.
--
-- The D-group form is now THE way discipleship gets recorded. A D-group can
-- be a mentoring group (a leader disciples members — including 1-on-1, which
-- is just leader + one member) or a peer group (members sharpen one another,
-- no leader). Peer groups have leader_id null and don't nest in the tree.
-- ============================================================================

alter table dgroups
  add column if not exists kind text not null default 'mentoring';
alter table dgroups drop constraint if exists dgroups_kind_check;
alter table dgroups
  add constraint dgroups_kind_check check (kind in ('mentoring','peer'));

notify pgrst, 'reload schema';

-- Self-check: should list the kind column.
select column_name from information_schema.columns
where table_name = 'dgroups' and column_name = 'kind';
