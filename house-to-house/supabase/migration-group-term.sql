-- ============================================================================
-- Group terminology: churches call their groups different things - Lifegroup,
-- House Church, Life Group, Missional Community. The app already stores the
-- word in churches.settings.groupTerm (no schema change needed); this teaches
-- the ONE place that can't read settings client-side about it: the public
-- /join directory, whose visitors aren't signed in yet.
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create or replace function public.church_directory(p_slug text default null)
returns json language sql stable security definer set search_path = public as
$$
  select json_build_object(
    'name', c.name,
    'slug', c.slug,
    'groupTerm', coalesce(nullif(trim(c.settings->>'groupTerm'), ''), 'Lifegroup'),
    'groups', coalesce((
      select json_agg(json_build_object('id', g.id, 'name', g.name) order by g.name)
      from groups g
      where g.church_id = c.id and g.status <> 'dissolved'
    ), '[]'::json)
  )
  from churches c
  where (p_slug is not null and c.slug = p_slug)
     or (p_slug is null and (select count(*) from churches) = 1);
$$;

notify pgrst, 'reload schema';

-- Self-check: the directory should now carry groupTerm.
select case when pg_get_functiondef(oid) like '%groupTerm%'
  then '✅ church_directory carries groupTerm'
  else '❌ old version still installed' end as status
from pg_proc where proname = 'church_directory';
