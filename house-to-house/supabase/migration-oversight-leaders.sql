-- ============================================================================
-- Section & zone leaders. Run once in the Supabase SQL Editor. Safe to re-run.
--
-- THE IDEA: a section leader gets, for every lifegroup in their section,
-- exactly what a lifegroup leader already gets for their own group - see the
-- roster, edit its members, run the check-in, work the MVP board. A zone
-- leader gets the same across every section in their zone.
--
-- HOW, WITHOUT REWRITING THE WORLD: fifteen-odd policies across six migrations
-- already ask one question - public.leads_group(gid). So this widens THAT,
-- rather than editing every policy to also ask about oversight. One definition
-- to reason about, and no way for the two to drift apart later.
--
-- Zones and sections themselves stay where they already live: churches.settings
-- JSON, which is also what the emailed-report routing reads. Only the
-- person -> scope assignment becomes a real table, because RLS has to join
-- against it.
--
-- WHAT IT DOES NOT GRANT: assigning oversight is staff-only. A section leader
-- cannot promote themselves to zone leader, cannot grant app access, and
-- cannot touch groups outside their scope.
-- ============================================================================

create table if not exists oversight_leaders (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references churches(id) on delete cascade,
  person_id  uuid not null references people(id) on delete cascade,
  scope      text not null check (scope in ('zone','section')),
  -- The id from churches.settings.zones[].id / .sections[].id. Text, not a
  -- foreign key, because those live in JSON - see the header.
  scope_id   text not null,
  created_at timestamptz not null default now(),
  unique (person_id, scope, scope_id)
);

alter table oversight_leaders enable row level security;

-- Who oversees what is org structure, readable church-wide like memberships.
drop policy if exists oversight_leaders_select on oversight_leaders;
create policy oversight_leaders_select on oversight_leaders for select
  using (church_id = public.current_church_id());

-- Handing out oversight is staff's alone. This is the line that stops a
-- section leader from widening their own scope.
drop policy if exists oversight_leaders_write on oversight_leaders;
create policy oversight_leaders_write on oversight_leaders for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());

-- ---------------------------------------------------------------------------
-- Does the caller oversee the section (or zone) this group sits in?
-- Walks group -> section -> zone through the settings JSON.
-- ---------------------------------------------------------------------------
create or replace function public.oversees_group(gid uuid)
returns boolean language sql stable security definer set search_path = public as
$$
  with me as (
    select pr.person_id, pr.church_id
    from profiles pr
    where pr.id = auth.uid() and pr.person_id is not null
  ),
  cfg as (
    select c.settings as s from churches c join me on c.id = me.church_id
  ),
  sec as (
    select (cfg.s -> 'groupSections') ->> (gid::text) as section_id from cfg
  ),
  zon as (
    select e ->> 'zoneId' as zone_id
    from cfg, sec,
         jsonb_array_elements(coalesce(cfg.s -> 'sections', '[]'::jsonb)) e
    where e ->> 'id' = sec.section_id
  )
  select exists (
    select 1
    from oversight_leaders ol
    join me on me.person_id = ol.person_id and me.church_id = ol.church_id
    where (ol.scope = 'section' and ol.scope_id = (select section_id from sec))
       or (ol.scope = 'zone'    and ol.scope_id = (select zone_id     from zon))
  )
$$;

-- ---------------------------------------------------------------------------
-- The one question every leader policy asks. Unchanged for a lifegroup leader;
-- now also true for whoever oversees that group's section or zone.
-- ---------------------------------------------------------------------------
create or replace function public.leads_group(gid uuid)
returns boolean language sql stable security definer set search_path = public as
$$
  select
    exists (
      select 1
      from profiles pr
      join memberships m on m.person_id = pr.person_id
      join churches c on c.id = m.church_id
      where pr.id = auth.uid()
        and m.group_id = gid
        and m.left_at is null
        and (
          m.role in ('leader','intern','worship')
          or m.role in (
            select jsonb_array_elements_text(
              coalesce(c.settings -> 'leadershipRoleIds', '[]'::jsonb))
          )
        )
    )
    or public.oversees_group(gid)
$$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Self-check: table, both functions, and whoever is already assigned.
-- ---------------------------------------------------------------------------
select 'table' as kind, 'oversight_leaders' as name,
  case when to_regclass('public.oversight_leaders') is not null
    then '✅ present' else '❌ missing' end as status
union all
select 'function', 'oversees_group',
  case when exists (select 1 from pg_proc where proname = 'oversees_group')
    then '✅ present' else '❌ missing' end
union all
select 'function', 'leads_group (widened)',
  case when exists (select 1 from pg_proc
                    where proname = 'leads_group'
                      and pg_get_functiondef(oid) like '%oversees_group%')
    then '✅ honors oversight' else '❌ old version still installed' end
union all
select 'assigned', p.first_name || ' ' || p.last_name, ol.scope || ': ' || ol.scope_id
  from oversight_leaders ol join people p on p.id = ol.person_id;
