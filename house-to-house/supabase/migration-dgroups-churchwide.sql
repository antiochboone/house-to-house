-- ============================================================================
-- Church-wide D-groups. Run once in the Supabase SQL Editor. Safe to re-run.
--
-- D-groups no longer have to live inside a single lifegroup. A D-group can be
-- led by anyone (including staff who aren't on a lifegroup roster) and include
-- people from different lifegroups — e.g. "Hunter disciples Brad, Steven, and
-- Jonah." group_id becomes optional; when null, the D-group is a free-standing
-- discipleship cluster shown church-wide in the discipleship tree.
-- ============================================================================

alter table dgroups alter column group_id drop not null;

notify pgrst, 'reload schema';

-- Self-check: group_id should now be nullable (is_nullable = YES).
select column_name, is_nullable
from information_schema.columns
where table_name = 'dgroups' and column_name = 'group_id';
