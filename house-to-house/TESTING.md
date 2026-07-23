# Manual test script — auth, permissions & multi-church

Everything below has been verified in demo mode (no database), which means the
**row-level security policies — the actual enforcement — have never run.** This
script walks the same paths against your live, Supabase-connected deployment so
you can trust them before a volunteer does.

Work top to bottom. Each test says what to do and what you should see. Where a
result lives in the database, there's a SQL check you can paste into the
Supabase SQL Editor.

---

## Before you start

**The one trick that makes solo testing possible.** Gmail (and most providers)
ignore anything after a `+` in an address, but auth treats each as a distinct
login. So from a single inbox you can be many people:

- `you+staff@gmail.com`
- `you+leader@gmail.com`
- `you+section@gmail.com`
- `you+newbie@gmail.com`

Every sign-in link lands in the same inbox; each is a separate account. Use
these throughout instead of chasing down real volunteers.

**Keep this query open in a second tab** — it's the ground truth for "who can
get in," and you'll refer back to it constantly:

```sql
select au.email,
       coalesce(pr.role, '❌ NO PROFILE') as access,
       p.first_name || ' ' || p.last_name as person,
       p.app_access as granted
from auth.users au
left join profiles pr on pr.id = au.id
left join people p    on p.id = pr.person_id
order by 2, 1;
```

**Legend:** ⬜ not run · ✅ passed · ❌ failed (note what you saw)

---

## 0. Preflight — did every migration land?

⬜ Paste **`supabase/health-check.sql`** into the SQL Editor and run it.

**Expect:** every row reads `✅`. Any `❌` names the migration file to run.
Do not go further until this is all green — every test below assumes it.

---

## 1. Sign-in repair — nobody strands in an empty church

The bug this fixed: someone who typed their email at the login screen *before*
staff granted access got an auth account with no profile, and no later sign-in
ever fixed it.

### 1a. The self-heal on sign-in
⬜ In People, add a person with `you+leader@gmail.com`. **Leave App access at
None.**
⬜ Open an incognito window, go to your app, request a sign-in link for that
address, click it.

**Expect:** the **"You're signed in — your access hasn't been turned on yet"**
screen, showing that exact email. *Not* an empty map, *not* an error.

⬜ Back as staff, open that person, set App access to **Leader**, save.
⬜ In the incognito window, click **Check again** (or sign out and back in).

**Expect:** the full leader view — the map with your church's groups.

```sql
-- Their profile should now exist and read 'leader':
select au.email, pr.role
from auth.users au left join profiles pr on pr.id = au.id
where lower(au.email) = 'you+leader@gmail.com';
```

### 1b. The backfill (only if you had stranded users before)
⬜ Run the ground-truth query. Anyone showing `❌ NO PROFILE` who *does* have
Leader/Staff granted on their person record is a real problem.

**Expect:** nobody in that state. If someone is, run
**`supabase/diagnose-signin.sql`** with their email — the `diagnosis` column
says exactly what to fix.

---

## 2. Leaders manage their own roster

**This is the least-proven, highest-risk feature** — leader writes have only
ever run with no RLS behind them. Test it carefully.

Setup: `you+leader@gmail.com` is a **Leader** and on a lifegroup's roster with
a leadership role (Leader / Intern / Worship). Confirm they can sign in and see
"My group."

### 2a. Add someone to their own group
⬜ Signed in as the leader, open the map. Press **＋ Add someone to my group**
(or open your group's drawer → **＋ add person**).

**Expect:** the group is locked to theirs — shown as fact, no dropdown to other
groups, no "not in a lifegroup" option.

⬜ Add a person. 

**Expect:** they appear on the roster; the count goes up.

```sql
-- The new person and their membership, in the leader's group:
select p.first_name, p.last_name, m.role, g.name
from people p
join memberships m on m.person_id = p.id and m.left_at is null
join groups g on g.id = m.group_id
where p.first_name = 'THE-NAME-YOU-TYPED';
```

### 2b. Edit a member of their group
⬜ In their group's drawer, click a member (an ordinary one — App access None).

**Expect:** an edit form with name, role, discipleship, email, phone — **but no
App access controls, no delete link, no end-relationship buttons.**

⬜ Rename them, save.

**Expect:** the roster updates. No silent "saved" that didn't stick — if the
policy ever refused, you'd get a clear permission message instead.

### 2c. The boundaries hold
⬜ As the leader, open a **different** group's drawer (one they don't lead).

**Expect:** no ＋ add, and clicking a row does nothing — read-only.

⬜ Still as the leader, in their own group, try to edit a person who has
**Leader or Staff** access (a co-leader).

**Expect:** that row is not clickable. (Editing a login's email is how you'd
hijack their access — the policy forbids it, and the UI matches.)

```sql
-- Prove the policy itself refuses, not just the UI. As the leader (via the
-- app's SQL is staff-only, so instead trust 2c's UI result) — or spot-check
-- that no member's email was changed to something unexpected:
select first_name, last_name, email, app_access from people
where church_id = (select church_id from profiles
                   where id = (select id from auth.users
                               where lower(email)='you+leader@gmail.com'))
order by app_access desc;
```

---

## 3. Access requests — nobody waits in silence

Needs email configured in Vercel: `RESEND_API_KEY`, `REPORT_FROM_EMAIL`, and
`SUPABASE_SERVICE_ROLE_KEY`. Without them the request still *queues*; only the
email is skipped.

### 3a. The alert fires (and only once)
⬜ Sign in as `you+newbie@gmail.com` — an address with **no person record at
all**. 

**Expect (multi-church nuance):** because no church has a record for this
email, it has nothing to file against — you land on the access screen with the
**"start a new church"** option, and *no* alert is sent. (This is the spam
guard: unknown addresses can't mail your admins.) Leave this for test 5.

⬜ Now the real case: add a person with `you+section@gmail.com`, App access
**None**. Sign in as them.

**Expect:** the access-pending screen. Within a minute, an email titled
**"…is waiting on app access"** arrives at your admin inbox.

⬜ Reload that screen two or three times.

**Expect:** no additional emails. One per person, not one per visit.

```sql
select email, kind, requested_at, notified_at
from access_requests where resolved_at is null order by requested_at desc;
```
**Expect:** one open row for that address, with `notified_at` set.

### 3b. The queue and one-click grant
⬜ As staff, open **Settings → Access requests**.

**Expect:** a "Waiting on you" card naming that person, with **Grant Leader** /
**Grant Staff** buttons.

⬜ Click **Grant Leader**.

**Expect:** the row disappears, and the person now has Leader access (check the
ground-truth query). The request resolved itself — you didn't tick anything.

### 3c. Who gets the mail (configurable)
⬜ In the same card, tick a specific admin under **Admins**, save.

**Expect:** the hint changes to "Only the people ticked above get these
emails." (With nobody ticked, it falls back to every Staff-access person.)

---

## 4. Section & zone leaders

Setup: in **Settings → Zones & sections**, create a zone, a section, put the
section in the zone, and assign two lifegroups to the section.

### 4a. Assigning oversight
⬜ In the new **"Who oversees what"** block, add `you+section@gmail.com` (now a
Leader from 3b) as the **section's** leader.

**Expect:** their chip appears; the section shows its group count.

```sql
select p.first_name, ol.scope, ol.scope_id
from oversight_leaders ol join people p on p.id = ol.person_id;
```

### 4b. Oversight grants the full leader experience
⬜ Sign in as `you+section@gmail.com`. Open the map.

**Expect:** every group in that section reads **"· in your care"** and opens
with full detail — roster, check-in, MVP board — exactly as a group leader sees
their own. Groups *outside* the section stay read-only.

⬜ Open one of those groups and edit a member; open the check-in page.

**Expect:** both work. This is the RLS `leads_group` widening — if it holds
here, it holds everywhere, because every permission routes through that one
function.

### 4c. Oversight can't escalate itself
⬜ Confirm `you+section@gmail.com` has **no** Settings, People, or Discipleship
in their sidebar.

**Expect:** correct — oversight is leader-level authority over more groups, not
staff access.

### 4d. Cleanup is honest
⬜ As staff, delete that section (Zones & sections).

**Expect:** its oversight assignment is gone too — re-check the SQL from 4a; the
row should be deleted, not orphaned.

---

## 5. Multi-church — the front door

⚠️ **This creates a real church in your production database.** Cleanup SQL is at
the end; use a `test-` name so it's easy to find.

⬜ Sign in as `you+newbie@gmail.com` (still no person record anywhere).
⬜ On the access screen, click **"Setting House to House up for a different
church?"**, name it e.g. **"Test Church"**, add your name, **Create the
church.**

**Expect:** you land in a brand-new, empty map — you are its first staff
member. The wordmark reads "Test Church."

```sql
select c.name, c.slug, p.first_name, pr.role
from churches c
join profiles pr on pr.church_id = c.id
join people p on p.id = pr.person_id
where c.name = 'Test Church';
```
**Expect:** one church, one staff profile, your founder person record — and
`app_access` on that person reads `staff` (the insert-order dance around the
guard trigger worked).

⬜ Confirm isolation: from this new church you see **none** of Antioch Boone's
groups or people.

⬜ Try to create a church again from the same login (sign out, back in — you now
have a profile, so you'd see your new church, not the access screen).

**Expect:** no way to create a second one. One login, one church.

**Cleanup when done:**
```sql
-- Cascades to that church's people, groups, memberships, and profiles. The
-- auth.users row remains; that login simply returns to the access screen.
delete from churches where name = 'Test Church';
```

---

## 6. Church name

⬜ As staff, **Settings → Church name**, change it, **Save.**

**Expect:** the top-left wordmark updates immediately; the leader-facing map
heading ("Lifegroups at …") follows. Reload — it persists.

```sql
select name from churches where id = (select church_id from profiles
                                      where id = auth.uid());
```

⬜ Confirm a **leader** account has no Church name card (Settings is staff-only).

---

## 7. Reminders (optional — needs the cron)

Only if you rely on check-in reminder emails. This runs on `pg_cron`; you can
trigger it by hand to avoid waiting for a meeting window.

⬜ Confirm the cron env is set in Vercel (`CRON_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`) and the job is scheduled:
```sql
select jobname, schedule from cron.job;
```
⬜ Set a test group's reminder to Weekly with your address, and its meeting
day/time to ~2 hours ago today. Wait for the next hourly run (or invoke the
endpoint with the `CRON_SECRET` bearer header).

**Expect:** one reminder email, and only one — `reminder.lastSent` updates so
the next run skips it.

---

## If something fails

- **Empty app / "not part of a group":** `supabase/diagnose-signin.sql` with
  their email.
- **Can sign in but can't check in:** `supabase/diagnose-login.sql`.
- **A migration reads ❌:** run that file; all are safe to re-run.
- **A leader write "succeeds" but nothing changes:** that path now surfaces a
  permission message instead — if you see a silent no-op, capture the exact
  steps; it means UI and policy disagree.
