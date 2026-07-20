-- ============================================================================
-- House to House — full database schema (run once in the Supabase SQL Editor)
-- Multi-tenant from day one: every row belongs to a church. Antioch Boone is
-- seeded as tenant #1 at the bottom of this file.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenancy & configuration
-- ---------------------------------------------------------------------------

create table churches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  -- Per-church configuration: pulse words, follow-up milestones, tier labels,
  -- oversight labels, etc. Sensible defaults live in app code.
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Optional oversight layers (zones / sections). A lifegroup may point at one of
-- these, or directly at nothing (flat structure — Antioch Boone today).
create table oversight_units (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references churches(id) on delete cascade,
  name       text not null,
  kind       text not null default 'custom' check (kind in ('zone','section','custom')),
  parent_id  uuid references oversight_units(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People & groups
-- ---------------------------------------------------------------------------

create table people (
  id                  uuid primary key default gen_random_uuid(),
  church_id           uuid not null references churches(id) on delete cascade,
  first_name          text not null,
  last_name           text not null default '',
  gender              text check (gender in ('M','F')),
  email               text,
  phone               text,
  -- Discipleship statuses (multiple allowed; empty = not yet invited):
  discipleship_status text[] not null default '{}',
  is_child            boolean not null default false,
  notes               text,
  created_at          timestamptz not null default now()
);

create table groups (
  id            uuid primary key default gen_random_uuid(),
  church_id     uuid not null references churches(id) on delete cascade,
  name          text not null,
  status        text not null default 'active' check (status in ('active','dormant','dissolved')),
  season        text check (season in ('start','build','plant','stagnant')),
  meeting_day   text,
  meeting_time  text,
  meeting_place text,
  is_family     boolean not null default false,
  oversight_id  uuid references oversight_units(id) on delete set null,
  -- Latest planting-readiness assessment: {score, date, attendance, checks}
  readiness     jsonb,
  created_at    timestamptz not null default now()
);

create table memberships (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid not null references churches(id) on delete cascade,
  person_id       uuid not null references people(id) on delete cascade,
  group_id        uuid not null references groups(id) on delete cascade,
  -- Built-in ids are leader/intern/worship/member; churches can add custom
  -- role ids in settings, so this is an open text field (no CHECK).
  role            text not null default 'member',
  engagement_tier text check (engagement_tier in ('lead','core','consistent','fringe')),
  joined_at       date not null default current_date,
  left_at         date,
  unique (person_id, group_id)
);

create index memberships_group_idx on memberships (group_id) where left_at is null;
create index memberships_person_idx on memberships (person_id) where left_at is null;

-- ---------------------------------------------------------------------------
-- Discipleship
-- ---------------------------------------------------------------------------

create table discipleship_relationships (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references churches(id) on delete cascade,
  discipler_id uuid not null references people(id) on delete cascade,
  disciple_id  uuid not null references people(id) on delete cascade,
  kind         text not null default 'mentoring' check (kind in ('mentoring','peer')),
  started_at   date not null default current_date,
  ended_at     date,
  check (discipler_id <> disciple_id)
);

create index dship_discipler_idx on discipleship_relationships (discipler_id) where ended_at is null;
create index dship_disciple_idx on discipleship_relationships (disciple_id) where ended_at is null;

-- ---------------------------------------------------------------------------
-- History ledger (powers the lineage timeline)
-- ---------------------------------------------------------------------------

create table group_events (
  id                 uuid primary key default gen_random_uuid(),
  church_id          uuid not null references churches(id) on delete cascade,
  group_id           uuid not null references groups(id) on delete cascade,
  kind               text not null check (kind in
    ('planted','replanted','merged','dissolved','dormant','leader_transition','renamed','milestone')),
  -- For plants: the parent group. For merges: the receiving group.
  related_group_id   uuid references groups(id) on delete set null,
  happened_on        date not null,
  notes              text,
  created_at         timestamptz not null default now()
);

create index group_events_group_idx on group_events (group_id, happened_on);

-- ---------------------------------------------------------------------------
-- Check-ins & wins
-- ---------------------------------------------------------------------------

create table checkins (
  id             uuid primary key default gen_random_uuid(),
  church_id      uuid not null references churches(id) on delete cascade,
  group_id       uuid not null references groups(id) on delete cascade,
  month          date not null,                    -- first of month
  submitted_by   uuid references people(id) on delete set null,
  meeting_change text,
  pulse_words    text[] not null default '{}',
  roster_notes   text,
  notes          text,
  created_at     timestamptz not null default now(),
  unique (group_id, month)
);

create table wins (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references churches(id) on delete cascade,
  group_id   uuid references groups(id) on delete set null,
  category   text not null default 'other' check (category in
    ('answered_prayer','salvation','baptism','new_dship','other')),
  body       text not null,
  happened_on date not null default current_date,
  is_public  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Guest follow-up
-- ---------------------------------------------------------------------------

create table guests (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references churches(id) on delete cascade,
  person_id    uuid references people(id) on delete set null,
  full_name    text not null,
  gender       text check (gender in ('M','F')),
  description  text,
  first_sunday date,
  attending    text not null default 'new' check (attending in ('yes','sporadic','new')),
  connect_card boolean not null default false,
  email        text,
  phone        text,
  -- Milestone completion keyed by the church's configured milestone ids
  -- (default: emailed, texted, coffee, discover, lifegroup, discipled).
  milestones   jsonb not null default '{}'::jsonb,
  outcome      text check (outcome in
    ('landed','moved_away','other_church','went_cold','sundays_only')),
  archived_at  timestamptz,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tags (geography, season of life, custom) → group filters
-- ---------------------------------------------------------------------------

create table tags (
  id        uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  kind      text not null default 'custom' check (kind in ('geography','life_stage','custom')),
  label     text not null,
  unique (church_id, kind, label)
);

create table group_tags (
  group_id uuid not null references groups(id) on delete cascade,
  tag_id   uuid not null references tags(id) on delete cascade,
  primary key (group_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- App users (auth.users → church + role + optional person link)
-- ---------------------------------------------------------------------------

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  church_id  uuid not null references churches(id) on delete cascade,
  person_id  uuid references people(id) on delete set null,
  role       text not null default 'leader' check (role in ('staff','leader')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create function public.current_church_id()
returns uuid language sql stable security definer set search_path = public as
$$ select church_id from profiles where id = auth.uid() $$;

create function public.is_staff()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'staff') $$;

-- Does the signed-in user actively lead the given group? Leadership roles are
-- the built-ins (leader/intern/worship) plus any ids the church marked as
-- leadership in settings.leadershipRoleIds.
create function public.leads_group(gid uuid)
returns boolean language sql stable security definer set search_path = public as
$$
  select exists (
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
          select jsonb_array_elements_text(coalesce(c.settings->'leadershipRoleIds', '[]'::jsonb))
        )
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- Staff: everything in their church. Leaders: church-wide reads of the map
-- basics (people, groups, memberships, wins); sensitive workflows (guests,
-- check-in contents beyond their group, discipleship church-wide) are
-- staff-scoped. NOTE (documented limitation, tightened in M3): RLS is
-- row-level, so people.discipleship_status is technically readable by any
-- signed-in leader; the UI hides it outside their group.
-- ---------------------------------------------------------------------------

alter table churches enable row level security;
alter table oversight_units enable row level security;
alter table people enable row level security;
alter table groups enable row level security;
alter table memberships enable row level security;
alter table discipleship_relationships enable row level security;
alter table group_events enable row level security;
alter table checkins enable row level security;
alter table wins enable row level security;
alter table guests enable row level security;
alter table tags enable row level security;
alter table group_tags enable row level security;
alter table profiles enable row level security;

-- churches
create policy churches_select on churches for select using (id = public.current_church_id());
create policy churches_update on churches for update using (id = public.current_church_id() and public.is_staff());

-- generic church-scoped reads
create policy oversight_select on oversight_units for select using (church_id = public.current_church_id());
create policy people_select    on people    for select using (church_id = public.current_church_id());
create policy groups_select    on groups    for select using (church_id = public.current_church_id());
create policy memberships_select on memberships for select using (church_id = public.current_church_id());
create policy events_select    on group_events for select using (church_id = public.current_church_id());
create policy wins_select      on wins      for select using (church_id = public.current_church_id() and (is_public or public.is_staff()));
create policy tags_select      on tags      for select using (church_id = public.current_church_id());
create policy group_tags_select on group_tags for select
  using (exists (select 1 from groups g where g.id = group_id and g.church_id = public.current_church_id()));

-- staff-only writes (M3 will add narrow leader-write policies for their own group)
create policy oversight_write on oversight_units for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());
create policy people_write on people for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());
create policy groups_write on groups for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());
create policy memberships_write on memberships for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());
create policy events_write on group_events for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());
create policy wins_write on wins for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());
create policy tags_write on tags for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());
create policy group_tags_write on group_tags for all
  using (public.is_staff() and exists (select 1 from groups g where g.id = group_id and g.church_id = public.current_church_id()))
  with check (public.is_staff() and exists (select 1 from groups g where g.id = group_id and g.church_id = public.current_church_id()));

-- discipleship: staff see all; leaders see relationships touching their group(s)
create policy dship_select on discipleship_relationships for select using (
  church_id = public.current_church_id()
  and (
    public.is_staff()
    or exists (
      select 1 from memberships m
      where m.person_id in (discipler_id, disciple_id)
        and m.left_at is null
        and public.leads_group(m.group_id)
    )
  )
);
create policy dship_write on discipleship_relationships for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());

-- check-ins: staff, or the group's own leaders
create policy checkins_select on checkins for select using (
  church_id = public.current_church_id() and (public.is_staff() or public.leads_group(group_id))
);
create policy checkins_insert on checkins for insert with check (
  church_id = public.current_church_id() and (public.is_staff() or public.leads_group(group_id))
);
create policy checkins_update on checkins for update using (
  church_id = public.current_church_id() and (public.is_staff() or public.leads_group(group_id))
);

-- guests: staff only
create policy guests_all on guests for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());

-- profiles: read your own; staff read their church's; staff manage their church's
create policy profiles_select_own on profiles for select using (id = auth.uid());
create policy profiles_select_staff on profiles for select using (
  church_id = public.current_church_id() and public.is_staff()
);
create policy profiles_write_staff on profiles for all
  using (church_id = public.current_church_id() and public.is_staff())
  with check (church_id = public.current_church_id() and public.is_staff());

-- ---------------------------------------------------------------------------
-- Auto-link sign-ins to people by email (first sign-in creates a leader
-- profile when the email matches a person record)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
declare
  v_person people%rowtype;
begin
  select * into v_person
  from people
  where email is not null and lower(email) = lower(new.email)
  limit 1;
  if found then
    insert into profiles (id, church_id, person_id, role)
    values (new.id, v_person.church_id, v_person.id, 'leader')
    on conflict (id) do nothing;
  end if;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Leader write policies (check-in flow): update own group, add newcomers, post wins
create policy groups_update_leader on groups for update
  using (public.leads_group(id)) with check (public.leads_group(id));
create policy people_insert_leader on people for insert
  with check (church_id = public.current_church_id());
create policy memberships_insert_leader on memberships for insert
  with check (church_id = public.current_church_id() and public.leads_group(group_id));
create policy wins_insert_leader on wins for insert
  with check (church_id = public.current_church_id());

-- ---------------------------------------------------------------------------
-- Seed: tenant #1
-- ---------------------------------------------------------------------------

insert into churches (name, slug) values ('Antioch Boone', 'antioch-boone');

-- ============================================================================
-- AFTER your first magic-link sign-in, run this once (replace the email) to
-- make yourself staff:
--
--   insert into profiles (id, church_id, role)
--   select u.id, c.id, 'staff'
--   from auth.users u, churches c
--   where u.email = 'YOUR-EMAIL-HERE' and c.slug = 'antioch-boone';
-- ============================================================================
