-- ============================================================================
-- Import: "Guest Follow Up" spreadsheet -> House to House guest pipeline.
-- Generated from the sheet; run ONCE in the Supabase SQL Editor.
--
--   79 guest records from 52 sheet rows (couples/families split into
--   individuals; children noted in the sheet are kept in the description
--   rather than given their own follow-up record).
--   32 archived as "went cold" (first visit Feb 2026 or earlier, no
--   milestone progress, and not still attending).
--   5 graduated into the people directory as unplaced (Tobie & Leeann
--   Childs, Joel & Heidi Hayslip, Desmond Knox) - assign their lifegroup after.
--
-- Safe to re-run: every insert is skipped if a guest with that name exists.
-- Wrapped in a transaction, so it all lands or none of it does.
-- ============================================================================

begin;

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Landon', 'M', 'Tyson Carr''s friend', '2025-08-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Landon');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Jon Price', 'M', 'friend of Dom Pengjad', '2025-08-01', 'new',
       true, 'j.price785@yahoo.com', '336-620-1074', '{"emailed": true, "texted": false, "coffee": false, "discover": true, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Jon Price');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Jacob Daniels', 'M', 'from HH. A few kids (Leah)', '2025-10-01', 'sporadic',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Attending: sometimes. From sheet row: Jacob & Malina Daniels',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Jacob Daniels');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Malina Daniels', 'F', 'from HH. A few kids (Leah)', '2025-10-01', 'sporadic',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Attending: sometimes. From sheet row: Jacob & Malina Daniels',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Malina Daniels');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Willinghams', null, 'HH?', '2025-10-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Willinghams');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Ryan Miller', 'M', 'friends of Pengjads.  From HH.', '2025-10-01', 'yes',
       false, 'Btweenthieves@yahoo.com', null, '{"emailed": false, "texted": false, "coffee": false, "discover": true, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Ryan & Cary Miller, Rhema, Samny, & Day',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Ryan Miller');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Cary Miller', null, 'friends of Pengjads.  From HH.', '2025-10-01', 'yes',
       false, 'Btweenthieves@yahoo.com', null, '{"emailed": false, "texted": false, "coffee": false, "discover": true, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Ryan & Cary Miller, Rhema, Samny, & Day',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Cary Miller');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Alex', 'M', 'friends of Dotsons', '2025-10-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Alex & Nicole & baby Dakota',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Alex');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Nicole', 'F', 'friends of Dotsons', '2025-10-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Alex & Nicole & baby Dakota',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Nicole');

-- Tobie Childs: graduate into the directory (unplaced)
with c as (select id from churches limit 1),
     p as (
       insert into people (church_id, first_name, last_name, gender, email, phone,
                           discipleship_status, notes)
       select c.id, 'Tobie', 'Childs', 'M', 'leeannbowlden24@yahoo.com', '(404) 396-9331', '{}',
              'Graduated from guest follow-up import'
       from c
       where not exists (select 1 from guests g where g.full_name = 'Tobie Childs')
       returning id
     )
insert into guests (church_id, person_id, full_name, gender, description, first_sunday,
                    attending, connect_card, email, phone, milestones, notes,
                    outcome, archived_at)
select c.id, p.id, 'Tobie Childs', 'M', 'from HH.  Brought parents on 11/16', '2025-09-01', 'yes',
       false, 'leeannbowlden24@yahoo.com', '(404) 396-9331', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Tobie & Leeann Childs',
       'sundays_only', now()
from c, p;

-- Leeann Childs: graduate into the directory (unplaced)
with c as (select id from churches limit 1),
     p as (
       insert into people (church_id, first_name, last_name, gender, email, phone,
                           discipleship_status, notes)
       select c.id, 'Leeann', 'Childs', 'F', 'leeannbowlden24@yahoo.com', '(404) 396-9331', '{}',
              'Graduated from guest follow-up import'
       from c
       where not exists (select 1 from guests g where g.full_name = 'Leeann Childs')
       returning id
     )
insert into guests (church_id, person_id, full_name, gender, description, first_sunday,
                    attending, connect_card, email, phone, milestones, notes,
                    outcome, archived_at)
select c.id, p.id, 'Leeann Childs', 'F', 'from HH.  Brought parents on 11/16', '2025-09-01', 'yes',
       false, 'leeannbowlden24@yahoo.com', '(404) 396-9331', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Tobie & Leeann Childs',
       'sundays_only', now()
from c, p;

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Zach Tate', 'M', 'friend of Greenes', '2025-09-01', 'yes',
       true, 'zachrtate@gmail.com', '828-773-4271', '{"emailed": true, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Submitted: CC',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Zach Tate');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Linda Tate', 'F', 'friends of Greenes', '2025-10-01', 'new',
       true, 'lindagrits@gmail.com', '828-773-4270', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: CC -10/19/25',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Linda Tate');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'AJ', 'M', '(baby Vera) - from HH', '2025-10-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: AJ & Alexis',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'AJ');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Alexis', 'F', '(baby Vera) - from HH', '2025-10-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: AJ & Alexis',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Alexis');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Kyle Terry', 'M', 'Physical therapist.  He knows Bob K.', '2025-10-26', 'new',
       true, 'Kterry55@gmail.com', '252-450-9231', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: CC -10/26/25',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Kyle Terry');

-- Joel Hayslip: graduate into the directory (unplaced)
with c as (select id from churches limit 1),
     p as (
       insert into people (church_id, first_name, last_name, gender, email, phone,
                           discipleship_status, notes)
       select c.id, 'Joel', 'Hayslip', 'M', 'Jhhayslip@gmail.com', '918-671-6409', '{}',
              'Graduated from guest follow-up import'
       from c
       where not exists (select 1 from guests g where g.full_name = 'Joel Hayslip')
       returning id
     )
insert into guests (church_id, person_id, full_name, gender, description, first_sunday,
                    attending, connect_card, email, phone, milestones, notes,
                    outcome, archived_at)
select c.id, p.id, 'Joel Hayslip', 'M', 'from HH. Missionaries. Christa''s friends', '2025-10-26', 'yes',
       true, 'Jhhayslip@gmail.com', '918-671-6409', '{"emailed": false, "texted": false, "coffee": false, "discover": true, "lifegroup": false, "discipled": false}'::jsonb, 'Submitted: CC - 10/26/25. From sheet row: Joel & Heidi, Silas (18) Hayslip',
       'sundays_only', now()
from c, p;

-- Heidi Hayslip: graduate into the directory (unplaced)
with c as (select id from churches limit 1),
     p as (
       insert into people (church_id, first_name, last_name, gender, email, phone,
                           discipleship_status, notes)
       select c.id, 'Heidi', 'Hayslip', 'F', 'Jhhayslip@gmail.com', '918-671-6409', '{}',
              'Graduated from guest follow-up import'
       from c
       where not exists (select 1 from guests g where g.full_name = 'Heidi Hayslip')
       returning id
     )
insert into guests (church_id, person_id, full_name, gender, description, first_sunday,
                    attending, connect_card, email, phone, milestones, notes,
                    outcome, archived_at)
select c.id, p.id, 'Heidi Hayslip', 'F', 'from HH. Missionaries. Christa''s friends', '2025-10-26', 'yes',
       true, 'Jhhayslip@gmail.com', '918-671-6409', '{"emailed": false, "texted": false, "coffee": false, "discover": true, "lifegroup": false, "discipled": false}'::jsonb, 'Submitted: CC - 10/26/25. From sheet row: Joel & Heidi, Silas (18) Hayslip',
       'sundays_only', now()
from c, p;

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Silas Hayslip', 'M', 'from HH. Missionaries. Christa''s friends', '2025-10-26', 'yes',
       true, 'Jhhayslip@gmail.com', '918-671-6409', '{"emailed": false, "texted": false, "coffee": false, "discover": true, "lifegroup": false, "discipled": false}'::jsonb, 'Submitted: CC - 10/26/25. From sheet row: Joel & Heidi, Silas (18) Hayslip',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Silas Hayslip');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Bridget Wilson', 'F', 'son Jude & Flynn.  Deep Gap.', '2025-11-02', 'sporadic',
       true, 'BridgetIreneWilson@gmail.com', null, '{"emailed": false, "texted": false, "coffee": false, "discover": true, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: LG Form - 11/01/25. From sheet row: Bridget and Ryan Wilson',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Bridget Wilson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Ryan Wilson', 'M', 'son Jude & Flynn.  Deep Gap.', '2025-11-02', 'sporadic',
       true, 'BridgetIreneWilson@gmail.com', null, '{"emailed": false, "texted": false, "coffee": false, "discover": true, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: LG Form - 11/01/25. From sheet row: Bridget and Ryan Wilson',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Ryan Wilson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Judith Drummond', 'F', '70s.  Need close parking.', '2025-11-16', 'new',
       true, 'jldrum9904@gmail.com', '828-238-2557', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: CC - 11/16/25',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Judith Drummond');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Yana', 'F', 'Ukrainian new friend of Carss', '2025-11-16', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Yana ___________',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Yana');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Salem Hudson', 'F', '20s post college.  She conencted with people at church.', '2025-11-23', 'new',
       true, 'salem.hudson@gmail.com', '(980) 298-3630', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: LG Form - 11/15/25',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Salem Hudson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Victoria Baulieu', 'F', 'from HH. In her 60s', '2025-11-16', 'new',
       true, 'Vbaulieu@gmail.com', null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: Online Contact submission 11/16/25',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Victoria Baulieu');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Hailey', 'F', 'young 20s.  SP Intern.  She connected with Alyssa and was invited to LG.', '2025-11-23', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Hailey __________',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Hailey');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Jim', 'M', 'in 70s.  Friends of Jeremy Anderson', '2025-11-23', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Jim and Libby',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Jim');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Libby', 'F', 'in 70s.  Friends of Jeremy Anderson', '2025-11-23', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Jim and Libby',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Libby');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Agnus', null, 'Used to come to Mill.  Knows Dobsons.', '2025-11-23', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Agnus');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Andy', 'M', 'Mid-aged couple.', '2025-11-30', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Andy & Jenny',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Andy');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Jenny', 'F', 'Mid-aged couple.', '2025-11-30', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Andy & Jenny',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Jenny');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Michael', 'M', 'PT @ OrthoRehab in Boone.  Treas & Caroline talked to him for a while.', '2025-11-30', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Michael');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'David', 'M', 'Older couple from Lenoir', '2025-11-30', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: David & Dana',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'David');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Dana', 'F', 'Older couple from Lenoir', '2025-11-30', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: David & Dana',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Dana');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Andrew Stankevich', 'M', 'HEAVENLY MT.', '2026-01-11', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: ANDREW STANKEVICH',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Andrew Stankevich');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Austin', 'M', 'App Students', '2026-01-11', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Austin & Ashley',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Austin');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Ashley', 'F', 'App Students', '2026-01-11', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Austin & Ashley',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Ashley');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Tyler Brunson', 'M', 'friends of Hunter.  Past - HH.', '2026-02-10', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'First visit noted as: 2nd Sunday 02/10/26. From sheet row: Tyler & Courtney Brunson',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Tyler Brunson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Courtney Brunson', 'F', 'friends of Hunter.  Past - HH.', '2026-02-10', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'First visit noted as: 2nd Sunday 02/10/26. From sheet row: Tyler & Courtney Brunson',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Courtney Brunson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Sarah', 'F', 'SP apprentice.  She came last year.', null, 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'First visit noted as: Spring 2025. Sheet marked: no longer attending',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Sarah');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Tanner Boley', 'M', 'HH family.  SP.  Grace Academy', '2026-02-22', 'new',
       true, 'Tannerboley@gmail.com, Scettibety@gmail.com', 'T- 828-379-1863, C- 828-379-4962', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: CC- 02/22/26. From sheet row: Tanner & Colette Boley, Silas (15, Basil (14)',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Tanner Boley');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Colette Boley', 'F', 'HH family.  SP.  Grace Academy', '2026-02-22', 'new',
       true, 'Tannerboley@gmail.com, Scettibety@gmail.com', 'T- 828-379-1863, C- 828-379-4962', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: CC- 02/22/26. From sheet row: Tanner & Colette Boley, Silas (15, Basil (14)',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Colette Boley');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Jesse', 'M', 'Younter family.  Maybe from HH', '2026-02-22', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Jesse & Sophia  & kid (Cora - little girl)',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Jesse');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Sophia', 'F', 'Younter family.  Maybe from HH', '2026-02-22', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Jesse & Sophia  & kid (Cora - little girl)',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Sophia');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Mark', 'M', 'Younger family.  Maybe from Baptism church in BR.  He works at SP with Christa in HR.', '2026-02-22', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Mark & Cara & kid (Clare - little girl)',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Mark');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Cara', 'F', 'Younger family.  Maybe from Baptism church in BR.  He works at SP with Christa in HR.', '2026-02-22', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Mark & Cara & kid (Clare - little girl)',
       'went_cold', now()
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Cara');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Taylor Braly', 'M', 'Staying with Eddie. In his 30s.', '2026-02-10', 'new',
       false, 'TayKnight1990@proton.me', null, '{"emailed": false, "texted": false, "coffee": false, "discover": true, "lifegroup": true, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Taylor Braly');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Blake', 'M', 'in their 60s. New to this area.', '2026-03-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Blake & Beth',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Blake');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Beth', 'F', 'in their 60s. New to this area.', '2026-03-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Blake & Beth',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Beth');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Keira', 'F', 'Friend of Delaney. New to town.  SP. Lived in Germany', '2026-03-01', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Keira');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Alessio Belli', 'M', 'brother-in-law of Treas', '2026-03-15', 'new',
       true, 'alessiobelli94@gmail.com', '(347) 862- 8200', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. Submitted: CC-03/15/2026',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Alessio Belli');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Finn Belli', 'F', 'Hanifan daughter.   Treas'' sister', '2026-03-15', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Finn Belli (formerly Hanifan)',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Finn Belli');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Rashad', 'M', 'SP.', '2026-03-22', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Rashad');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Neil Brunson', 'M', 'They''ve been here before', null, 'sporadic',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Attending: Off & On. From sheet row: Neil, Megan, and Azalea Brunson',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Neil Brunson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Megan Brunson', 'F', 'They''ve been here before', null, 'sporadic',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Attending: Off & On. From sheet row: Neil, Megan, and Azalea Brunson',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Megan Brunson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Azalea Brunson', 'F', 'They''ve been here before', null, 'sporadic',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Attending: Off & On. From sheet row: Neil, Megan, and Azalea Brunson',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Azalea Brunson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Hunter', 'M', 'App Students.  From Asheville aera.', '2026-03-29', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Hunter & Elizabeth',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Hunter');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Elizabeth', 'F', 'App Students.  From Asheville aera.', '2026-03-29', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Hunter & Elizabeth',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Elizabeth');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Aidan', 'M', 'Also App students and from Asheville.', '2026-03-29', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Aidan & Elizabeth',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Aidan');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Elizabeth', 'F', 'Also App students and from Asheville.', '2026-03-29', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending. From sheet row: Aidan & Elizabeth',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Elizabeth');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Audra', 'F', '60s', '2026-04-07', 'new',
       false, 'budget@hosphouse.org', null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Audra');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Kyle', 'M', '30s. Came with parents (Trodder & Carol)', '2026-04-07', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Sheet marked: no longer attending',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Kyle');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Chase Cranford', 'M', 'Friends of Brunsons.  HH.', '2026-02-10', 'sporadic',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'First visit noted as: 2nd Sunday 02/10/26. Attending: sometimes. From sheet row: Chase, Samara (and lil'' Rain) Cranford',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Chase Cranford');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Samara Cranford', 'F', 'Friends of Brunsons.  HH.', '2026-02-10', 'sporadic',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'First visit noted as: 2nd Sunday 02/10/26. Attending: sometimes. From sheet row: Chase, Samara (and lil'' Rain) Cranford',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Samara Cranford');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Lili Page', 'F', 'Freda met via FB Marketplace', null, 'new',
       true, 'lilipage08@gmail.com', '(828) 216-6426', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Submitted: LG Submission 05/02/2026',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Lili Page');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Meagan Brunson', 'F', 'Husband is Neil', '2026-05-17', 'new',
       true, 'meagan.brunson@gmail.com', null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Submitted: CC 05/23/26',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Meagan Brunson');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Zane', 'M', 'friends of Mat S', '2026-06-07', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Zane and Addie',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Zane');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Addie', 'F', 'friends of Mat S', '2026-06-07', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Zane and Addie',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Addie');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Shannon', 'F', 'From Costa Rica...knows Wisemans', '2026-06-07', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Shannon and son Sonny',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Shannon');

-- Desmond Knox: graduate into the directory (unplaced)
with c as (select id from churches limit 1),
     p as (
       insert into people (church_id, first_name, last_name, gender, email, phone,
                           discipleship_status, notes)
       select c.id, 'Desmond', 'Knox', 'M', null, null, '{}',
              'Graduated from guest follow-up import'
       from c
       where not exists (select 1 from guests g where g.full_name = 'Desmond Knox')
       returning id
     )
insert into guests (church_id, person_id, full_name, gender, description, first_sunday,
                    attending, connect_card, email, phone, milestones, notes,
                    outcome, archived_at)
select c.id, p.id, 'Desmond Knox', 'M', 'coworker of Mat S', null, 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Desmond',
       'sundays_only', now()
from c, p;

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Dale', 'M', 'lives in Charlotte. Visits every weekend.', '2026-06-14', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Dale & Sherry',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Dale');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Sherry', 'F', 'lives in Charlotte. Visits every weekend.', '2026-06-14', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Dale & Sherry',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Sherry');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Philip', 'M', 'from H.H. / knows Laura Edem', '2026-06-14', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Philip, Sarah, and baby Ruby',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Philip');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Sarah', 'F', 'from H.H. / knows Laura Edem', '2026-06-14', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Philip, Sarah, and baby Ruby',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Sarah');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Steve Walters', 'M', 'Lives in BR. Engineer. Maybe 65.  Mom lives in BR', '2026-06-21', 'new',
       true, 'stevew847@gmail.com', '470-630-0910', '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'Submitted: CC - 06/21/26',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Steve Walters');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Brewtons', null, null, null, 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, null,
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Brewtons');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Julia', 'F', 'ladies in their 20s', '2026-07-19', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Julia, Victoria, & Riley (friends of the Schnitzers',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Julia');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Victoria', 'F', 'ladies in their 20s', '2026-07-19', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Julia, Victoria, & Riley (friends of the Schnitzers',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Victoria');

insert into guests (church_id, full_name, gender, description, first_sunday, attending,
                    connect_card, email, phone, milestones, notes, outcome, archived_at)
select c.id, 'Riley', 'F', 'ladies in their 20s', '2026-07-19', 'new',
       false, null, null, '{"emailed": false, "texted": false, "coffee": false, "discover": false, "lifegroup": false, "discipled": false}'::jsonb, 'From sheet row: Julia, Victoria, & Riley (friends of the Schnitzers',
       null, null
from (select id from churches limit 1) c
where not exists (select 1 from guests g where g.full_name = 'Riley');

commit;

-- Check: counts by state after import.
select count(*) filter (where archived_at is null) as active,
       count(*) filter (where outcome = 'went_cold') as archived_cold,
       count(*) filter (where person_id is not null) as graduated,
       count(*) as total
from guests;
