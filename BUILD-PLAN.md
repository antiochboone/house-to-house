# House to House — Build Plan

> The working plan for the real app. Decisions log lives in Claude's project memory; research in `research/lifegroupleaders-study.md`; approved design prototype in `design/prototype-v1.html`.

## Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS** — deployed on Vercel free tier
- **Supabase** free tier — Postgres, magic-link auth (persistent sessions), Row-Level Security for staff/leader roles
- Custom SVG/React visualizations for the map, trees, and timeline (React Flow if/where it earns its keep)
- Multi-tenant from day one: every table carries `church_id`; Antioch Boone is tenant #1
- Infrastructure owned by **church accounts** (GitHub, Vercel, Supabase) — walkthrough at deploy time

## Design system (from approved prototype v2)

- Magnolia palette: linen `#FAF7F1` background, more beige surfaces, green accent `#4E9E5F`, tan neutrals; warm charcoal + sage dark mode
- Gender coding: **muted slate-blue = men, soft clay-rose = women** (desaturated to fit the palette)
- Display type: Palatino-family serif; UI: system sans
- Season chips: sprout green (Starting Up), gold (Building Up), ember (Planting)
- Tone: insights not verdicts; celebration not gamification; Waco vocabulary (Lifegroup, plant/replant, oikos, the lost, cast vision)

## Data model (Postgres)

```
churches            id, name, slug, settings jsonb   ← per-church config:
                                                        pulse words, follow-up milestones,
                                                        tier labels, oversight labels
users (auth)        supabase auth.users + profiles: church_id, person_id?, role (staff|leader)
oversight_units     id, church_id, name, type (zone|section|custom), parent_id?   ← optional layers
people              id, church_id, first/last name, gender, email?, phone?,
                    discipleship_status (being|discipling|open|invited|declined|wants|none),
                    notes, created_at
groups              id, church_id, name, status (active|dormant|dissolved),
                    season (start|build|plant), meeting day/time/place, format,
                    oversight_id?, created_at
memberships         person_id, group_id, role (leader|intern|worship|member),
                    engagement_tier (lead|core|consistent|fringe), joined_at, left_at?
discipleship_rel    discipler_id, disciple_id, type (mentoring|peer), started_at, ended_at?
dgroups             id, group_id, gender, name?; dgroup_members join table
group_events        id, church_id, group_id, type (planted|replanted|merged|dissolved|
                    leader_transition|renamed), parent_group_id?, secondary_group_id?,
                    happened_on, notes            ← the immutable history LEDGER
checkins            id, group_id, month, submitted_by, meeting_changed?, pulse_words[],
                    roster_changes jsonb, notes, created_at
wins                id, church_id, group_id?, category (answered_prayer|salvation|baptism|
                    new_dship|other), text, date, is_public
guests              id, church_id, person_id?, description, first_sunday, attending
                    (yes|sporadic|new), connect_card, milestones jsonb (per-church steps),
                    outcome? (landed|moved_away|other_church|went_cold|sundays_only),
                    archived_at?, notes
tags                id, church_id, kind (geography|life_stage|custom), label
group_tags          group_id, tag_id
```

Rules encoded in app logic:
- Discipleship mentoring edges are same-gender only
- Guest "landed in a lifegroup" = graduation → auto-retire from pipeline, link person to group
- Guest outcome `sundays_only` → appears on "not yet in a lifegroup" list
- Insights are **computed, never stored**: growth/shrink trends, roster-stagnation,
  D-group density vs 2+2, not-discipled counts, season suggestion, readiness prompts
- RLS: staff = full church; leader = own group full + church-wide names/map only

## Milestones

- **M1 — Shell & views (mock data):** design system, app shell, Lifegroup Map (cards +
  engagement chart), group drawer, Discipleship tree (collapsible, filters), typed domain
  model with a swappable data layer seeded from prototype data. Runs locally.
- **M2 — Real data:** church accounts walkthrough (GitHub/Supabase/Vercel), schema + RLS,
  magic-link auth, staff/leader roles, full CRUD: add/edit people, groups, memberships,
  discipleship relationships — optimized for Hunter hand-entering all real data fast.
- **M3 — Check-in & wins:** leader check-in flow with REAL inputs ("something changed" →
  edit meeting; "add someone" → person form), wins feed, insights engine v1.
- **M4 — Follow-up:** guest pipeline with configurable milestones, archive outcomes,
  graduation flow into people/groups.
- **M5 — History & timeline:** group_events ledger UI (record a plant/merge/dissolve/
  replant/transition) + the "web of lifegroups over time" visualization.
- **M6 — Config & multi-church:** settings UI (pulse words, milestones, tiers, oversight
  layers), tags + filters, church onboarding for tenant #2.
```
