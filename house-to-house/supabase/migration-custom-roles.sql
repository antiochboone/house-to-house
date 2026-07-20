-- ============================================================================
-- Custom lifegroup roles: allow church-defined role ids and let custom
-- leadership roles run check-ins. Run once in the Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- 1. Let memberships.role hold any church-defined role id (drop the CHECK).
alter table memberships drop constraint if exists memberships_role_check;

-- 2. leads_group now honors settings.leadershipRoleIds (custom leadership roles)
--    on top of the built-in leader / intern / worship.
create or replace function public.leads_group(gid uuid)
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

notify pgrst, 'reload schema';

-- Self-check: should return the leads_group function name.
select proname from pg_proc where proname = 'leads_group';
