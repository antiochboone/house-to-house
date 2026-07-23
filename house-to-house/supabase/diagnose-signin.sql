-- ============================================================================
-- "They can sign in but the app is empty / says they're not in a group."
-- Read-only; safe to run anytime. Covers the WHOLE chain in one query.
--
-- Five things have to line up. This tells you which one is broken:
--   1. a login exists for the address they actually type
--   2. a person record carries that exact same address
--   3. that person's App access is Leader or Staff (not None)
--   4. their login is linked to that person (the profiles row) - without it
--      every table reads back empty and the app looks like an empty church
--   5. for the CHECK-IN page only: an active membership on a lifegroup roster
--      whose role counts as leadership. Staff-level access skips this; Leader
--      access does not, even for someone who is staff at the church.
--
-- Put their email in the first line below, then Run.
-- (Supersedes diagnose-signin + diagnose-login - this covers both.)
-- ============================================================================

with target as (
  select lower(trim('REPLACE-WITH-THEIR-EMAIL')) as email
),
login as (
  select au.id, au.email, au.last_sign_in_at
  from auth.users au, target t
  where lower(trim(au.email)) = t.email
  limit 1
),
person as (
  select p.*
  from people p, target t
  where p.email is not null and lower(trim(p.email)) = t.email
  order by case when p.app_access = 'staff' then 0 else 1 end
  limit 1
),
prof as (
  select pr.* from profiles pr where pr.id = (select id from login)
),
-- Leadership roles: the built-ins plus any custom role the church flagged.
lead_ids as (
  select 'leader' as role union all select 'intern' union all select 'worship'
  union all
  select jsonb_array_elements_text(coalesce(c.settings->'leadershipRoleIds', '[]'::jsonb))
  from churches c
),
mem as (
  select m.role, g.name as group_name,
         m.role in (select role from lead_ids) as is_leadership
  from memberships m
  join groups g on g.id = m.group_id
  where m.person_id = (select id from person)
    and m.left_at is null
),
-- Near-misses: a person record whose email differs only by case, spacing, a
-- +tag, or Gmail dots. The quiet one - it all "looks right" to staff and the
-- app still can't connect the two.
near as (
  select string_agg(p.email || ' (' || p.first_name || ' ' || p.last_name ||
                    ', access: ' || p.app_access || ')', '; ') as candidates
  from people p, target t
  where p.email is not null
    and lower(trim(p.email)) <> t.email
    and (
      replace(split_part(lower(trim(p.email)), '@', 1), '.', '')
        = replace(split_part(split_part(t.email, '+', 1), '@', 1), '.', '')
      or split_part(lower(trim(p.email)), '+', 1) = split_part(t.email, '+', 1)
    )
)
select
  (select email from target)                            as signing_in_as,
  (select last_sign_in_at from login)                   as last_signed_in,
  (select first_name || ' ' || last_name from person)   as person_record,
  (select app_access from person)                       as app_access_granted,
  (select role from prof)                               as app_role_in_use,
  (select count(*) from mem)                            as active_memberships,
  (select count(*) from mem where is_leadership)         as leadership_memberships,
  (select string_agg(group_name || ' - ' || role, '; ') from mem)
                                                        as groups_on_roster,
  (select candidates from near)                         as similar_emails_on_file,
  case
    -- Chain link 1-2: identity
    when (select id from login) is null then
      'No login exists for that address. They have never requested a sign-in link with it - check for a typo, or which address they actually used.'
    when (select id from person) is null then
      'No person record carries that address. Add it to their person record (or fix the one on file), then re-save their App access. Check similar_emails_on_file.'

    -- Chain link 3-4: access
    when (select app_access from person) = 'none' then
      'FIX (access): their App access is None. Having their email on file grants nothing - open their card in People and set App access to Leader (or Staff).'
    when (select id from prof) is null then
      'FIX (access): access is granted but their login was never connected - they signed in before the grant. Run migration-signin-repair.sql, or re-save their App access.'
    when (select person_id from prof) is null then
      'FIX (access): their profile is not linked to a person record. Re-save their App access in the person editor.'
    when (select role from prof) is distinct from (select app_access from person) then
      'FIX (access): signed in at the wrong level (' || (select role from prof) ||
      ' vs granted ' || (select app_access from person) || '). Re-save their App access.'

    -- Chain link 5: check-in needs a leadership seat on a roster
    when (select role from prof) = 'staff' then
      'Access is correct and full. Staff can check in for any group, so they should not see the "not in a lifegroup" screen at all. If the app still looks empty for them, sign out and back in.'
    when (select count(*) from mem) = 0 then
      'FIX (roster): access is fine, but they are not on ANY lifegroup roster - so the check-in page has no group to offer them. Add them to their group in the person editor.'
    when (select count(*) from mem where is_leadership) = 0 then
      'FIX (roster): access is fine and they are on a roster, but as ' ||
      (select string_agg(role, '/') from mem) ||
      ', which does not count as leadership. Set their role to Leader on that group. ' ||
      'NOTE: if they are staff at the church, granting Staff-level App access also solves it.'
    else
      'Everything checks out - they should have full leader access and a working check-in. If they still see a block, have them sign out and back in (their session predates the fix).'
  end                                                   as diagnosis;
