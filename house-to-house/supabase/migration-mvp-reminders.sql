-- ============================================================================
-- MVP board + configurable check-in reminders. Run once in the Supabase SQL
-- Editor. Safe to re-run.
--
-- 1. MVP board: guests can be connected to a lifegroup. Leaders of that group
--    can SEE and CONTRIBUTE to their MVPs' journey (tap milestones, update the
--    note) — staff still owns adding, archiving, and graduating.
--
-- 2. Reminders: per-group check-in reminder config lives on the group row
--    (groups.reminder jsonb: {frequency: off|weekly|monthly, recipients: [],
--    lastSent: iso}). Leaders can edit their own group's config (the existing
--    groups_update_leader policy covers it); staff can edit any.
-- ============================================================================

-- 1. Guests belong (optionally) to a lifegroup.
alter table guests
  add column if not exists group_id uuid references groups(id) on delete set null;

drop policy if exists guests_select_leader on guests;
create policy guests_select_leader on guests for select using (
  church_id = public.current_church_id()
  and group_id is not null
  and public.leads_group(group_id)
);

drop policy if exists guests_update_leader on guests;
create policy guests_update_leader on guests for update
  using (
    church_id = public.current_church_id()
    and group_id is not null
    and public.leads_group(group_id)
  )
  with check (
    church_id = public.current_church_id()
    and group_id is not null
    and public.leads_group(group_id)
  );

-- 2. Per-group reminder config.
alter table groups
  add column if not exists reminder jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

-- Self-check: expect guests.group_id and groups.reminder.
select table_name, column_name from information_schema.columns
where (table_name = 'guests' and column_name = 'group_id')
   or (table_name = 'groups' and column_name = 'reminder');
