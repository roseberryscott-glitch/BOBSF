-- Privacy rule checks. Run against a database with the migration applied:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/privacy_test.sql
-- Each check raises an exception on failure; everything runs in a rolled-back transaction.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@x.org',  '{"full_name":"Ada Admin","group_id":"army"}'),
  ('00000000-0000-0000-0000-00000000000b', 'leader@x.org', '{"full_name":"Lee Leader","group_id":"army"}'),
  ('00000000-0000-0000-0000-00000000000c', 'm1@x.org',     '{"full_name":"Max Army","group_id":"army"}'),
  ('00000000-0000-0000-0000-00000000000d', 'm2@x.org',     '{"full_name":"Nia Navy","group_id":"navy"}'),
  ('00000000-0000-0000-0000-00000000000e', 'f@x.org',      '{"full_name":"Fran Friend","group_id":"friends"}'),
  ('00000000-0000-0000-0000-00000000000f', 'p@x.org',      '{"full_name":"Pat Pending","group_id":"army"}'),
  ('00000000-0000-0000-0000-000000000010', 'bad@x.org',    '{"full_name":"Bad Group","group_id":"nope"}');

-- Bootstrap: the first admin is set by hand (see README).
update public.profiles set status = 'approved', role = 'admin' where email = 'admin@x.org';
update public.profiles set status = 'approved' where email in ('leader@x.org','m1@x.org','m2@x.org','f@x.org');
update public.profiles set role = 'leader' where email = 'leader@x.org';
update public.profiles set phone = '555-0001' where email = 'm1@x.org';
update public.profiles set name_visibility = 'all', contact_visibility = 'group', phone = '555-0002' where email = 'm2@x.org';
-- M1 keeps personal info private (the default); the leader makes theirs public.
update public.profiles set address_line1 = '1 Main St', city = 'Rockwall', state = 'TX', postal_code = '75087',
  job_title = 'Mechanic', retired = true, business_name = 'Not a business owner' where email = 'm1@x.org';
update public.profiles set contact_visibility = 'all', address_line1 = '9 Oak Ln',
  is_business_owner = true, business_name = 'Lee Lawn Care' where email = 'leader@x.org';

create function pg_temp.act_as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true); $$;
create function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', msg; end if; end $$;
grant execute on all functions in schema pg_temp to authenticated;

select pg_temp.check((select group_id from profiles where email='bad@x.org') = 'friends', 'unknown group falls back to friends');
select pg_temp.check((select first_name || '|' || last_name from profiles where email='m1@x.org') = 'Max|Army', 'full name split into first and last');

set local role authenticated;

-- Army member M1
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from profiles) = 1, 'member sees only own full profile row');
select pg_temp.check(exists (select 1 from member_directory() where full_name = 'Lee Leader'), 'member sees own group');
select pg_temp.check(exists (select 1 from member_directory() where full_name = 'Nia Navy'), 'member sees opted-in name from other branch');
select pg_temp.check((select phone from member_directory() where full_name = 'Nia Navy') is null, 'group-only contact hidden from other branch');
select pg_temp.check(not exists (select 1 from member_directory() where full_name = 'Fran Friend'), 'group-only name hidden from other groups');
select pg_temp.check(not exists (select 1 from member_directory() where full_name = 'Pat Pending'), 'pending members hidden');
select pg_temp.check((select count(*) from forums) = 2, 'member sees public + own branch forum');
select pg_temp.check((select address_line1 from member_directory() where full_name = 'Lee Leader') = '9 Oak Ln', 'public address shown');
select pg_temp.check(not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'date_of_birth'), 'date of birth is not stored');
select pg_temp.check((select business_name from member_directory() where full_name = 'Lee Leader') = 'Lee Lawn Care', 'business shown for owners');
update profiles set first_name = 'Maxwell' where id = auth.uid();
select pg_temp.check((select full_name from profiles where id = auth.uid()) = 'Maxwell Army', 'display name follows first and last name');
update profiles set first_name = 'Max' where id = auth.uid();
do $$ begin
  update profiles set role = 'admin' where id = auth.uid();
  raise exception 'FAILED: member made themself admin';
exception when insufficient_privilege then null; end $$;

-- Navy member M2
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(not exists (select 1 from member_directory() where full_name = 'Max Army'), 'navy cannot see army group-only name');

-- Army leader
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select phone from member_directory() where full_name = 'Max Army') = '555-0001', 'leader sees own group contact');
select pg_temp.check((select phone from member_directory() where full_name = 'Nia Navy') is null, 'leader cannot see other branch group-only contact');
select pg_temp.check((select count(*) from profiles) = 1, 'leader reads only own full profile row');
select pg_temp.check((select coalesce(address_line1, city) from member_directory() where full_name = 'Max Army') is null, 'private address and city hidden from leader');
select pg_temp.check((select email from member_directory() where full_name = 'Max Army') = 'm1@x.org', 'leader still sees private member email');

-- Friend
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select array_agg(id order by id) from forums) = array['friends','public'], 'friend sees public + friends forum only');
insert into threads (forum_id, title) values ('public', 'Hello from a friend');
select pg_temp.check((select author_name from threads where title = 'Hello from a friend') = 'Fran Friend', 'author stamped from profile');
do $$ begin
  insert into threads (forum_id, title) values ('army', 'sneaky');
  raise exception 'FAILED: friend posted in army forum';
exception when insufficient_privilege then null; end $$;

-- Nobody can change the groups list through the API
do $$ begin
  insert into groups (id, name, short_name, sort_order) values ('x', 'x', 'x', 99);
  raise exception 'FAILED: member added a group';
exception when insufficient_privilege then null; end $$;
select pg_temp.check((select count(*) from groups) = 7, 'members can read groups');

-- Pending user
select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
select pg_temp.check((select count(*) from member_directory()) = 0, 'pending sees no directory');
select pg_temp.check((select count(*) from member_businesses()) = 0, 'pending sees no business directory');
select pg_temp.check((select count(*) from forums) = 0, 'pending sees no forums');
do $$ begin
  update profiles set status = 'approved' where id = auth.uid();
  raise exception 'FAILED: user approved themself';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform admin_set_status(auth.uid(), 'approved');
  raise exception 'FAILED: non-admin approved';
exception when raise_exception then
  if sqlerrm like 'FAILED%' then raise; end if;
end $$;

-- Army member posts in army forum; leader moderates; member cannot unhide
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into threads (forum_id, title) values ('army', 'Army only');
insert into posts (thread_id, body) select id, 'first post' from threads where title = 'Army only';
select pg_temp.check((select count(*) from thread_followers) = 1, 'author follows thread');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
update posts set hidden = true where body = 'first post';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
do $$ begin
  update posts set hidden = false where body = 'first post';
  raise exception 'FAILED: author unhid post';
exception when raise_exception then
  if sqlerrm like 'FAILED%' then raise; end if;
end $$;

-- Events: leaders publish only for their own group, navy can't see army event
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into events (title, starts_at, group_id, created_by) values ('Army BBQ', now(), 'army', auth.uid());
insert into events (title, starts_at, group_id, created_by) values ('All hands', now(), null, auth.uid());
select pg_temp.check((select status from events where title = 'Army BBQ') = 'approved', 'leader publishes for own group');
select pg_temp.check((select status from events where title = 'All hands') = 'pending', 'leader all-member event waits for an admin');
delete from events where title = 'All hands';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select count(*) from events) = 0, 'navy cannot see army event');

-- Member event suggestions wait for an admin
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into events (title, starts_at, group_id, created_by, status) values ('Army reunion', now() + interval '7 days', 'army', auth.uid(), 'approved');
insert into events (title, starts_at, group_id, created_by) values ('Everyone cookout', now() + interval '8 days', null, auth.uid());
insert into events (title, starts_at, group_id, created_by) values ('Withdrawn idea', now() + interval '9 days', null, auth.uid());
select pg_temp.check((select status from events where title = 'Army reunion') = 'pending', 'member suggestion is pending even if it says approved');
do $$ begin
  insert into events (title, starts_at, group_id, created_by) values ('Navy thing', now(), 'navy', auth.uid());
  raise exception 'FAILED: member suggested an event for another branch';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into event_rsvps (event_id, user_id) select id, auth.uid() from events where title = 'Army reunion';
  raise exception 'FAILED: RSVP to a pending event';
exception when insufficient_privilege then null; end $$;
delete from events where title = 'Withdrawn idea';
select pg_temp.check(not exists (select 1 from events where title = 'Withdrawn idea'), 'member withdraws own pending suggestion');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(not exists (select 1 from events where title = 'Army reunion'), 'leader does not see pending suggestion');
update events set status = 'approved' where title = 'Army reunion';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(not exists (select 1 from events where title = 'Everyone cookout'), 'other members do not see pending suggestion');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from events where status = 'pending') = 2, 'admin sees pending suggestions');
update events set status = 'approved' where title = 'Everyone cookout';
update events set status = 'declined', decline_reason = 'Date clash' where title = 'Army reunion';
select pg_temp.check((select reviewed_by from events where title = 'Everyone cookout') = auth.uid(), 'approval records the admin');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(exists (select 1 from events where title = 'Everyone cookout'), 'approved suggestion is on the calendar');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select decline_reason from events where title = 'Army reunion') = 'Date clash', 'member sees why a suggestion was declined');
delete from events where title = 'Everyone cookout';
select pg_temp.check(exists (select 1 from events where title = 'Everyone cookout'), 'member cannot delete an approved event');

-- Admin
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select admin_set_status('00000000-0000-0000-0000-00000000000f', 'approved');
select pg_temp.check((select status from profiles where email = 'p@x.org') = 'approved', 'admin approves');
select pg_temp.check((select count(*) from member_directory()) = 6, 'admin sees everyone approved');
select pg_temp.check((select address_line1 from member_directory() where full_name = 'Max Army') = '1 Main St', 'admin sees private personal info');
select pg_temp.check((select business_name from member_directory() where full_name = 'Max Army') is null, 'business details hidden when not an owner');
select pg_temp.check((select retired and job_title = 'Mechanic' from member_directory() where full_name = 'Max Army'), 'job and retired shown');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select array_agg(business_name) from member_businesses()) = array['Lee Lawn Care'], 'business directory lists owners to every member, not non-owners');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  perform admin_set_role(auth.uid(), 'member', 'army');
  raise exception 'FAILED: removed last admin';
exception when raise_exception then
  if sqlerrm like 'FAILED%' then raise; end if;
end $$;

-- Site pages: admin edits, hides; members and visitors can't edit or see hidden pages
update site_pages set visible = false where slug = 'elected';
update site_pages set sections = '[]'::jsonb where slug = 'about';
select pg_temp.check((select sections from site_pages where slug = 'about') = '[]'::jsonb, 'admin edits a page');
select admin_set_member_since('00000000-0000-0000-0000-00000000000d', 2011);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
update site_pages set title = 'hacked' where slug = 'home';
select pg_temp.check((select title from site_pages where slug = 'home') = 'Welcome', 'member cannot edit pages');
select pg_temp.check(not exists (select 1 from site_pages where slug = 'elected'), 'hidden page hidden from members');
select pg_temp.check((select member_since from member_directory() where full_name = 'Nia Navy') = 2011, 'member since shown in directory');
select pg_temp.check((select member_since from member_directory() where full_name = 'Lee Leader') = extract(year from now())::int, 'member since defaults to approval year');
do $$ begin
  perform admin_set_member_since(auth.uid(), 1990);
  raise exception 'FAILED: member changed member since';
exception when raise_exception then
  if sqlerrm like 'FAILED%' then raise; end if;
end $$;

reset role;
set local role anon;
select pg_temp.act_as('');
select pg_temp.check((select count(*) from site_pages) = 4, 'visitors see the 4 visible public pages');
select pg_temp.check(exists (select 1 from site_settings where key = 'branch_logos'), 'visitors can read branch logos');

reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000011', 'new@x.org', '{"first_name":" Sam ","last_name":"De La Cruz","group_id":"navy"}');
select pg_temp.check((select full_name from profiles where email = 'new@x.org') = 'Sam De La Cruz', 'signup with first and last name');
delete from auth.users where email = 'm1@x.org';
select pg_temp.check((select author_name from posts where body = 'first post') = 'Former member', 'deleted member anonymized');

select 'ALL PRIVACY CHECKS PASSED';
rollback;
