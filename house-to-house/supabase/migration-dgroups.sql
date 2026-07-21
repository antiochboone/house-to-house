-- ============================================================================
-- D-groups as first-class data. Run once in the Supabase SQL Editor.
-- Safe to re-run.
--
-- The 2+2 D-group pattern (2 men's + 2 women's) is THE plant-ready marker in
-- the model this app follows — until now the app only showed a hardcoded
-- placeholder string and approximated the pattern from one-to-one mentoring
-- edges. These tables make D-groups real: a named, gendered cluster of 3-5
-- people inside a lifegroup, with a leader and members.
-- ============================================================================

create table if not exists dgroups (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references churches(id) on delete cascade,
  group_id   uuid not null references groups(id) on delete cascade,
  gender     text not null check (gender in ('M','F')),
  -- Optional label; the app defaults the display to "<leader>'s D-group".
  name       text,
  leader_id  uuid references people(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists dgroup_members (
  id        uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  dgroup_id uuid not null references dgroups(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  unique (dgroup_id, person_id)
);

alter table dgroups enable row level security;
alter table dgroup_members enable row level security;

-- Mirrors the discipleship-relationship boundary: staff see all, leaders see
-- (and manage) the D-groups of groups they lead.
drop policy if exists dgroups_select on dgroups;
create policy dgroups_select on dgroups for select using (
  church_id = public.current_church_id()
  and (public.is_staff() or public.leads_group(group_id))
);
drop policy if exists dgroups_write on dgroups;
create policy dgroups_write on dgroups for all
  using (
    church_id = public.current_church_id()
    and (public.is_staff() or public.leads_group(group_id))
  )
  with check (
    church_id = public.current_church_id()
    and (public.is_staff() or public.leads_group(group_id))
  );

drop policy if exists dgroup_members_select on dgroup_members;
create policy dgroup_members_select on dgroup_members for select using (
  church_id = public.current_church_id()
  and exists (
    select 1 from dgroups d
    where d.id = dgroup_id
      and (public.is_staff() or public.leads_group(d.group_id))
  )
);
drop policy if exists dgroup_members_write on dgroup_members;
create policy dgroup_members_write on dgroup_members for all
  using (
    church_id = public.current_church_id()
    and exists (
      select 1 from dgroups d
      where d.id = dgroup_id
        and (public.is_staff() or public.leads_group(d.group_id))
    )
  )
  with check (
    church_id = public.current_church_id()
    and exists (
      select 1 from dgroups d
      where d.id = dgroup_id
        and (public.is_staff() or public.leads_group(d.group_id))
    )
  );

notify pgrst, 'reload schema';

-- Self-check: both tables should be listed.
select table_name from information_schema.tables
where table_name in ('dgroups', 'dgroup_members');
