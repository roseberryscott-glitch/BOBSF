-- BOBSF core schema.
--
-- Privacy rules live here, in row-level security and security-definer
-- functions, so a bug in the website can't leak contact info.
--
-- Roles:  member | leader | admin     (leader leads their own group)
-- Status: pending | approved | rejected | suspended

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Groups (branches of service plus Friends)
-- ---------------------------------------------------------------------------
create table public.groups (
  id text primary key,
  name text not null,
  short_name text not null,
  is_branch boolean not null default true,
  sort_order int not null
);

insert into public.groups (id, name, short_name, is_branch, sort_order) values
  ('army',        'Army',         'ARMY', true,  1),
  ('navy',        'Navy',         'NAVY', true,  2),
  ('marines',     'Marine Corps', 'USMC', true,  3),
  ('air_force',   'Air Force',    'USAF', true,  4),
  ('coast_guard', 'Coast Guard',  'USCG', true,  5),
  ('space_force', 'Space Force',  'USSF', true,  6),
  ('friends',     'Friends',      'FRND', false, 7);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  group_id text not null references public.groups (id),
  role text not null default 'member' check (role in ('member', 'leader', 'admin')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  -- What the applicant told admins to help verify service (free text, no documents).
  verification_note text,
  service_years text,
  bio text,
  city text,
  phone text,
  photo_path text,
  -- 'group': own group only; 'all': every approved member
  name_visibility text not null default 'group' check (name_visibility in ('group', 'all')),
  -- 'leaders': only their branch leader and admins; 'group'; 'all'
  contact_visibility text not null default 'leaders'
    check (contact_visibility in ('leaders', 'group', 'all')),
  email_forum boolean not null default true,
  email_announcements boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  consented_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index profiles_group_idx on public.profiles (group_id);
create index profiles_status_idx on public.profiles (status);

-- Helpers. Security definer so they can read profiles without recursing
-- through profiles' own RLS policies.
create or replace function public.my_profile()
returns public.profiles
language sql stable security definer set search_path = public
as $$ select * from public.profiles where id = auth.uid() $$;

create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved') $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role = 'admin'
  )
$$;

create or replace function public.my_group()
returns text
language sql stable security definer set search_path = public
as $$ select group_id from public.profiles where id = auth.uid() and status = 'approved' $$;

create or replace function public.is_leader_of(g text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role = 'leader' and group_id = g
  )
$$;

-- Leaders and admins can manage a group.
create or replace function public.can_manage_group(g text)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_admin() or public.is_leader_of(g) $$;

alter table public.profiles enable row level security;

-- Full rows (including contact info and verification notes) are only visible
-- to the member themself, admins, and the leader of that member's group.
-- Everyone else goes through member_directory() below.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.is_leader_of(group_id));

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Members may only change these columns on their own row. Role, status,
-- group and email are changed through the admin functions below.
revoke update on public.profiles from authenticated, anon;
grant update (
  full_name, service_years, bio, city, phone, photo_path,
  name_visibility, contact_visibility, email_forum, email_announcements
) on public.profiles to authenticated;

-- Create a pending profile whenever someone signs up. Signup form fields
-- arrive as auth user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  g text := coalesce(new.raw_user_meta_data ->> 'group_id', 'friends');
begin
  if not exists (select 1 from public.groups where id = g) then
    g := 'friends';
  end if;
  insert into public.profiles (id, email, full_name, group_id, verification_note, service_years, consented_at)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    g,
    new.raw_user_meta_data ->> 'verification_note',
    new.raw_user_meta_data ->> 'service_years',
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync if someone changes their login email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Member directory: what an approved member may see about other members.
-- ---------------------------------------------------------------------------
create or replace function public.member_directory()
returns table (
  id uuid,
  full_name text,
  group_id text,
  role text,
  service_years text,
  bio text,
  city text,
  photo_path text,
  email text,
  phone text
)
language sql stable security definer set search_path = public
as $$
  with me as (
    select p.id, p.group_id, p.role from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
  )
  select
    p.id,
    p.full_name,
    p.group_id,
    p.role,
    p.service_years,
    p.bio,
    p.city,
    p.photo_path,
    case when show_contact then p.email end,
    case when show_contact then p.phone end
  from public.profiles p
  cross join me
  cross join lateral (
    select (
      me.role = 'admin'
      or p.id = me.id
      or (me.role = 'leader' and me.group_id = p.group_id)
      or p.contact_visibility = 'all'
      or (p.contact_visibility = 'group' and me.group_id = p.group_id)
    ) as show_contact
  ) c
  where p.status = 'approved'
    and (
      me.role = 'admin'
      or p.group_id = me.group_id
      or p.name_visibility = 'all'
    )
$$;

revoke execute on function public.member_directory() from anon, public;
grant execute on function public.member_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log of admin and leader actions
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admin actions. Only admins approve members (decided 2026-09-29).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_status(member uuid, new_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change member status';
  end if;
  if new_status not in ('pending', 'approved', 'rejected', 'suspended') then
    raise exception 'Invalid status %', new_status;
  end if;
  if member = auth.uid() and new_status <> 'approved' then
    raise exception 'Admins cannot remove their own access';
  end if;

  update public.profiles
  set status = new_status,
      approved_at = case when new_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
      approved_by = case when new_status = 'approved' then coalesce(approved_by, auth.uid()) else approved_by end
  where id = member;

  insert into public.audit_log (actor_id, action, target_id, details)
  values (auth.uid(), 'set_status', member, jsonb_build_object('status', new_status));
end;
$$;

create or replace function public.admin_set_role(member uuid, new_role text, new_group text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  admin_count int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  if new_role not in ('member', 'leader', 'admin') then
    raise exception 'Invalid role %', new_role;
  end if;
  if not exists (select 1 from public.groups where id = new_group) then
    raise exception 'Invalid group %', new_group;
  end if;

  if new_role <> 'admin' then
    select count(*) into admin_count from public.profiles
    where role = 'admin' and status = 'approved' and id <> member;
    if admin_count = 0 then
      raise exception 'The site must keep at least one admin';
    end if;
  end if;

  update public.profiles set role = new_role, group_id = new_group where id = member;

  insert into public.audit_log (actor_id, action, target_id, details)
  values (auth.uid(), 'set_role', member, jsonb_build_object('role', new_role, 'group', new_group));
end;
$$;

revoke execute on function public.admin_set_status(uuid, text) from anon, public;
revoke execute on function public.admin_set_role(uuid, text, text) from anon, public;
grant execute on function public.admin_set_status(uuid, text) to authenticated;
grant execute on function public.admin_set_role(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Forums: one public forum, plus a private forum per group.
-- ---------------------------------------------------------------------------
create table public.forums (
  id text primary key,
  name text not null,
  description text,
  group_id text references public.groups (id), -- null = public forum
  sort_order int not null
);

insert into public.forums (id, name, description, group_id, sort_order) values
  ('public', 'Public Forum', 'Open to every member, including Friends.', null, 0);
insert into public.forums (id, name, description, group_id, sort_order)
  select id, name || ' Forum', 'Private to ' || name || ' members.', id, sort_order
  from public.groups;

create or replace function public.can_access_forum(f text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_approved() and exists (
    select 1 from public.forums
    where id = f and (group_id is null or group_id = public.my_group() or public.is_admin())
  )
$$;

create or replace function public.can_moderate_forum(f text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.forums
    where id = f and group_id is not null and public.is_leader_of(group_id)
  )
$$;

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  forum_id text not null references public.forums (id),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  title text not null check (char_length(title) between 1 and 200),
  pinned boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  last_post_at timestamptz not null default now()
);

create index threads_forum_idx on public.threads (forum_id, pinned desc, last_post_at desc);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_group text references public.groups (id),
  body text not null check (char_length(body) between 1 and 20000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index posts_thread_idx on public.posts (thread_id, created_at);

create table public.thread_followers (
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table public.post_reports (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Stamp author name and group from the profile so clients can't fake them.
-- Posting in a forum shows your name on that post to everyone who can read it.
create or replace function public.stamp_author()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  new.author_id := auth.uid();
  new.author_name := p.full_name;
  if tg_table_name = 'posts' then
    new.author_group := p.group_id;
  end if;
  return new;
end;
$$;

create trigger threads_stamp_author before insert on public.threads
  for each row execute function public.stamp_author();
create trigger posts_stamp_author before insert on public.posts
  for each row execute function public.stamp_author();

-- New posts bump the thread and make the author a follower.
create or replace function public.after_post_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.threads set last_post_at = new.created_at where id = new.thread_id;
  if new.author_id is not null then
    insert into public.thread_followers (thread_id, user_id)
    values (new.thread_id, new.author_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger posts_after_insert after insert on public.posts
  for each row execute function public.after_post_insert();

-- When an account is deleted, its posts stay but no longer carry the name.
create or replace function public.anonymize_author()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.threads set author_name = 'Former member' where author_id = old.id;
  update public.posts set author_name = 'Former member' where author_id = old.id;
  return old;
end;
$$;

create trigger profiles_anonymize_author before delete on public.profiles
  for each row execute function public.anonymize_author();

alter table public.forums enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;
alter table public.thread_followers enable row level security;
alter table public.post_reports enable row level security;

create policy forums_select on public.forums for select to authenticated
  using (public.can_access_forum(id));

create policy threads_select on public.threads for select to authenticated
  using (public.can_access_forum(forum_id));
create policy threads_insert on public.threads for insert to authenticated
  with check (public.can_access_forum(forum_id));
create policy threads_update on public.threads for update to authenticated
  using (public.can_moderate_forum(forum_id));
create policy threads_delete on public.threads for delete to authenticated
  using (public.can_moderate_forum(forum_id));

create or replace function public.thread_forum(t uuid)
returns text
language sql stable security definer set search_path = public
as $$ select forum_id from public.threads where id = t $$;

create or replace function public.thread_is_open(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.threads where id = t and not locked) $$;

create policy posts_select on public.posts for select to authenticated
  using (
    public.can_access_forum(public.thread_forum(thread_id))
    and (not hidden or author_id = auth.uid() or public.can_moderate_forum(public.thread_forum(thread_id)))
  );
create policy posts_insert on public.posts for insert to authenticated
  with check (
    public.can_access_forum(public.thread_forum(thread_id))
    and (public.thread_is_open(thread_id) or public.can_moderate_forum(public.thread_forum(thread_id)))
  );
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.can_moderate_forum(public.thread_forum(thread_id)));
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.can_moderate_forum(public.thread_forum(thread_id)));

-- Authors can edit their own posts, but only moderators can hide or unhide.
create or replace function public.guard_post_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.hidden is distinct from old.hidden
     and not public.can_moderate_forum(public.thread_forum(old.thread_id)) then
    raise exception 'Only moderators can hide posts';
  end if;
  if new.body is distinct from old.body and old.author_id is distinct from auth.uid() then
    raise exception 'Only the author can edit a post';
  end if;
  return new;
end;
$$;

create trigger posts_guard_update before update on public.posts
  for each row execute function public.guard_post_update();

revoke update on public.posts from authenticated, anon;
grant update (body, hidden, edited_at) on public.posts to authenticated;
revoke update on public.threads from authenticated, anon;
grant update (title, pinned, locked) on public.threads to authenticated;

create policy followers_select on public.thread_followers for select to authenticated
  using (user_id = auth.uid());
create policy followers_insert on public.thread_followers for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_forum(public.thread_forum(thread_id)));
create policy followers_delete on public.thread_followers for delete to authenticated
  using (user_id = auth.uid());

create policy reports_insert on public.post_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_approved());
create policy reports_select on public.post_reports for select to authenticated
  using (public.is_admin());
create policy reports_update on public.post_reports for update to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Calendar
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  group_id text references public.groups (id), -- null = everyone
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index events_starts_idx on public.events (starts_at);

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

create or replace function public.can_see_event_group(g text)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_approved() and (g is null or g = public.my_group() or public.is_admin()) $$;

-- Only branch leaders (for their own group) and admins create events.
create policy events_select on public.events for select to authenticated
  using (public.can_see_event_group(group_id));
create policy events_insert on public.events for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.is_admin() or (group_id is not null and public.is_leader_of(group_id)))
  );
create policy events_update on public.events for update to authenticated
  using (public.is_admin() or (group_id is not null and public.is_leader_of(group_id)))
  with check (public.is_admin() or (group_id is not null and public.is_leader_of(group_id)));
create policy events_delete on public.events for delete to authenticated
  using (public.is_admin() or (group_id is not null and public.is_leader_of(group_id)));

create or replace function public.event_group(e uuid)
returns text
language sql stable security definer set search_path = public
as $$ select group_id from public.events where id = e $$;

create policy rsvps_select on public.event_rsvps for select to authenticated
  using (public.is_approved());
create policy rsvps_insert on public.event_rsvps for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id)
  );
create policy rsvps_delete on public.event_rsvps for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Bulk email log (who emailed whom, for the audit trail)
-- ---------------------------------------------------------------------------
create table public.email_log (
  id bigint generated always as identity primary key,
  sender_id uuid references public.profiles (id) on delete set null,
  audience text not null, -- 'all' or a group id
  subject text not null,
  recipient_count int not null,
  created_at timestamptz not null default now()
);

alter table public.email_log enable row level security;
create policy email_log_select on public.email_log for select to authenticated
  using (public.is_admin() or (audience <> 'all' and public.is_leader_of(audience)));

-- ---------------------------------------------------------------------------
-- Profile photos: private bucket; approved members can view, members manage
-- files in their own folder (<user id>/...).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_approved());
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
