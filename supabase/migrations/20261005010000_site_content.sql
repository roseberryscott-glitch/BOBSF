-- Editable site content (pages, branch logos) and "Member since".
-- Safe to run once after the earlier migrations.

-- ---------------------------------------------------------------------------
-- Member since: the year someone joined BOBSF. Defaults to the approval year,
-- and admins can change it for people who joined before the website existed.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists member_since int check (member_since between 1900 and 2200);

update public.profiles
set member_since = extract(year from coalesce(approved_at, created_at))::int
where member_since is null and status = 'approved';

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
      approved_by = case when new_status = 'approved' then coalesce(approved_by, auth.uid()) else approved_by end,
      member_since = case
        when new_status = 'approved' then coalesce(member_since, extract(year from now())::int)
        else member_since
      end
  where id = member;

  insert into public.audit_log (actor_id, action, target_id, details)
  values (auth.uid(), 'set_status', member, jsonb_build_object('status', new_status));
end;
$$;

-- Fill in the year whenever someone becomes approved, however that happens
-- (including the first admin, who is approved by hand in the SQL editor).
create or replace function public.default_member_since()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and new.member_since is null then
    new.member_since := extract(year from now())::int;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_default_member_since on public.profiles;
create trigger profiles_default_member_since before insert or update on public.profiles
  for each row execute function public.default_member_since();

create or replace function public.admin_set_member_since(member uuid, since int)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change member since';
  end if;
  update public.profiles set member_since = since where id = member;
  insert into public.audit_log (actor_id, action, target_id, details)
  values (auth.uid(), 'set_member_since', member, jsonb_build_object('year', since));
end;
$$;

revoke execute on function public.admin_set_member_since(uuid, int) from anon, public;
grant execute on function public.admin_set_member_since(uuid, int) to authenticated;

-- The directory now includes member_since. Changing a function's columns
-- means dropping and recreating it.
drop function if exists public.member_directory();

create function public.member_directory()
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
  phone text,
  member_since int
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
    case when show_contact then p.phone end,
    p.member_since
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

-- New members fill out their profile after approval; this marks it done.
alter table public.profiles add column if not exists profile_completed_at timestamptz;
grant update (profile_completed_at) on public.profiles to authenticated;
-- People already on the site don't need to be sent to the profile form.
update public.profiles set profile_completed_at = now()
where status = 'approved' and profile_completed_at is null and approved_at < now() - interval '1 day';

-- ---------------------------------------------------------------------------
-- Site pages edited by admins in place. Each page is a list of sections
-- (hero, text, cards, people, links, image) stored as JSON.
-- ---------------------------------------------------------------------------
create table if not exists public.site_pages (
  slug text primary key,
  title text not null,
  -- Hidden pages are left out of the menu and only admins can open them.
  visible boolean not null default true,
  -- Public pages can be seen without signing in.
  is_public boolean not null default true,
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.site_pages enable row level security;

drop policy if exists site_pages_select on public.site_pages;
create policy site_pages_select on public.site_pages for select to anon, authenticated
  using (
    public.is_admin()
    or (visible and (is_public or public.is_approved()))
  );

drop policy if exists site_pages_update on public.site_pages;
create policy site_pages_update on public.site_pages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke insert, delete on public.site_pages from anon, authenticated;
revoke update on public.site_pages from anon;

-- Small key/value settings, e.g. branch logos.
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings for select to anon, authenticated
  using (true);

drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_write on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.site_settings from anon;
grant select on public.site_settings to anon;

insert into public.site_settings (key, value) values ('branch_logos', '{}'::jsonb)
on conflict (key) do nothing;

-- Starter content. Admins replace all of this from the site.
insert into public.site_pages (slug, title, visible, is_public, sections) values
(
  'home', 'Welcome', true, true,
  $json$[
    {"id":"hero","type":"hero","eyebrow":"Band of Brothers Sisters and Friends","heading":"Served together. Still standing together.","body":"A members-only home for veterans of every branch, and the friends and families who stand with them. Find your people, plan the next get-together, and keep the bond strong.","image":"","primaryLabel":"Ask to join","primaryHref":"/signup","secondaryLabel":"Member sign in","secondaryHref":"/login"},
    {"id":"branches","type":"branches","heading":"Every branch. One family.","body":"Each branch has its own members area and private forum, with a public forum where everyone, including Friends, can talk."},
    {"id":"features","type":"cards","heading":"What members get","items":[
      {"title":"Events calendar","body":"Reunions, cookouts, ceremonies and volunteer days, with RSVPs and reminders.","image":"","href":""},
      {"title":"Branch forums","body":"A private forum for your branch, plus a public forum for everyone.","image":"","href":""},
      {"title":"Member directory","body":"Reconnect with people you served with. You choose what others can see.","image":"","href":""}
    ]},
    {"id":"cta","type":"cta","heading":"Ready to fall in?","body":"Registrations are reviewed by an admin before access is granted.","label":"Ask to join","href":"/signup"}
  ]$json$::jsonb
),
(
  'about', 'About', true, true,
  $json$[
    {"id":"hero","type":"hero","eyebrow":"About BOBSF","heading":"Who we are","body":"Tell visitors what Band of Brothers Sisters and Friends is, why it started, and what it stands for.","image":"","primaryLabel":"","primaryHref":"","secondaryLabel":"","secondaryHref":""},
    {"id":"mission","type":"text","heading":"Our mission","body":"Write the mission here. Admins can click Edit page to change any of this text."},
    {"id":"values","type":"cards","heading":"What we value","items":[
      {"title":"Brotherhood and sisterhood","body":"Describe this value.","image":"","href":""},
      {"title":"Service","body":"Describe this value.","image":"","href":""},
      {"title":"Family","body":"Describe this value.","image":"","href":""}
    ]}
  ]$json$::jsonb
),
(
  'founders', 'Founders', true, true,
  $json$[
    {"id":"hero","type":"hero","eyebrow":"Our founders","heading":"The people who started it","body":"Share the story of how BOBSF began.","image":"","primaryLabel":"","primaryHref":"","secondaryLabel":"","secondaryHref":""},
    {"id":"people","type":"people","heading":"Founders","items":[
      {"name":"Founder name","role":"Founder","branch":"army","photo":"","bio":"A few lines about this founder."},
      {"name":"Founder name","role":"Co-founder","branch":"navy","photo":"","bio":"A few lines about this founder."}
    ]}
  ]$json$::jsonb
),
(
  'charities', 'Charities', true, true,
  $json$[
    {"id":"hero","type":"hero","eyebrow":"Giving back","heading":"Charities we support","body":"The causes BOBSF members support, and how you can help.","image":"","primaryLabel":"","primaryHref":"","secondaryLabel":"","secondaryHref":""},
    {"id":"charities","type":"cards","heading":"Our partners","items":[
      {"title":"Charity name","body":"What they do and how BOBSF helps.","image":"","href":""},
      {"title":"Charity name","body":"What they do and how BOBSF helps.","image":"","href":""}
    ]}
  ]$json$::jsonb
),
(
  'elected', 'Elected Members', true, true,
  $json$[
    {"id":"hero","type":"hero","eyebrow":"Leadership","heading":"Elected members","body":"The members elected to lead BOBSF.","image":"","primaryLabel":"","primaryHref":"","secondaryLabel":"","secondaryHref":""},
    {"id":"people","type":"people","heading":"Current officers","items":[
      {"name":"Name","role":"President","branch":"marines","photo":"","bio":""},
      {"name":"Name","role":"Vice President","branch":"air_force","photo":"","bio":""},
      {"name":"Name","role":"Secretary","branch":"friends","photo":"","bio":""}
    ]}
  ]$json$::jsonb
)
on conflict (slug) do nothing;

-- Pictures for site pages: anyone can view, only admins can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists site_media_insert on storage.objects;
create policy site_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and public.is_admin());
drop policy if exists site_media_update on storage.objects;
create policy site_media_update on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and public.is_admin());
drop policy if exists site_media_delete on storage.objects;
create policy site_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and public.is_admin());
