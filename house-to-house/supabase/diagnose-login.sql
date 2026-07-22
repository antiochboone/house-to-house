-- ============================================================================
-- Why can't this person check in? Read-only; safe to run anytime.
--
-- The check-in page needs BOTH of these to be true for a leader:
--   1. their login profile is linked to their person record (profile.person_id)
--   2. that person has an ACTIVE membership whose role is a leadership role
--      (leader / intern / worship, plus any custom role flagged as leadership)
-- Staff (app_access = 'staff') skip all of this and can check in for any group.
--
-- Put the person's email in the WHERE clause at the bottom, then Run.
-- ============================================================================

with target as (
  select p.*
  from people p
  where lower(p.email) = lower('REPLACE-WITH-THEIR-EMAIL')
),
lead_ids as (
  -- Built-in leadership roles plus any custom ones flagged in settings.
  select 'leader' as role union all select 'intern' union all select 'worship'
  union all
  select jsonb_array_elements_text(coalesce(c.settings->'leadershipRoleIds', '[]'::jsonb))
  from churches c
)
select
  t.first_name || ' ' || t.last_name          as person,
  t.email                                     as person_email,
  t.app_access                                as app_access,
  au.id is not null                           as has_login,
  pr.id is not null                           as has_profile,
  pr.role                                     as profile_role,
  pr.person_id = t.id                         as profile_linked_to_person,
  g.name                                      as group_name,
  m.role                                      as membership_role,
  m.left_at is null                           as membership_active,
  (m.role in (select role from lead_ids))     as role_counts_as_leadership,
  case
    when t.id is null then 'No person record with that email'
    when t.app_access = 'staff' then 'STAFF: can check in for any group (should not see the error)'
    when au.id is null then 'FIX: they have no login yet (no auth user for this email)'
    when pr.id is null then 'FIX: no profile row. Re-save their App access in the person editor'
    when pr.person_id is distinct from t.id then 'FIX: profile not linked to this person. Re-save their App access'
    when m.id is null then 'FIX: no membership. Add them to their lifegroup in the person editor'
    when m.left_at is not null then 'FIX: their membership was ended. Re-add them to the lifegroup'
    when m.role not in (select role from lead_ids) then 'FIX: on the roster but role is ' || m.role || '. Set it to Leader'
    else 'Looks correct: they should be able to check in'
  end                                         as diagnosis
from target t
left join auth.users au on lower(au.email) = lower(t.email)
left join profiles pr on pr.id = au.id
left join memberships m on m.person_id = t.id
left join groups g on g.id = m.group_id
order by m.left_at nulls first;
