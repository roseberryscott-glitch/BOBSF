-- Expanded member profile: first/last name, date of birth, mailing address,
-- job, business details, and a single public/private switch for personal info.
--
-- Personal info = email, phone, mailing address (including city), date of birth.
--   Public  (contact_visibility = 'all'):     shown to members who can see the profile
--                                              (date of birth as month and day only).
--   Private (contact_visibility = 'leaders'): admins see everything; the member's
--                                              branch leader sees phone and email only.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists date_of_birth date,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists job_title text,
  add column if not exists retired boolean not null default false,
  add column if not exists is_business_owner boolean not null default false,
  add column if not exists business_name text,
  add column if not exists business_website text,
  add column if not exists business_phone text,
  add column if not exists business_description text;

-- Split existing names: everything before the last space is the first name.
update public.profiles
set first_name = coalesce(nullif(regexp_replace(trim(full_name), '\s+\S+$', ''), ''), trim(full_name)),
    last_name = case when trim(full_name) ~ '\s' then regexp_replace(trim(full_name), '^.*\s', '') else '' end
where first_name is null;

-- full_name stays as the display name everywhere; keep it in sync.
create or replace function public.sync_full_name()
returns trigger
language plpgsql
as $$
begin
  if new.first_name is not null or new.last_name is not null then
    new.full_name := coalesce(nullif(trim(concat_ws(' ', trim(new.first_name), trim(new.last_name))), ''), new.full_name);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_full_name on public.profiles;
create trigger profiles_sync_full_name before insert or update on public.profiles
  for each row execute function public.sync_full_name();

-- Signup now sends first_name and last_name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  g text := coalesce(new.raw_user_meta_data ->> 'group_id', 'friends');
  fname text := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  lname text := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  whole text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  -- Older sign-up forms send one full name: split it the same way as above.
  if fname is null and lname is null and whole is not null then
    fname := coalesce(nullif(regexp_replace(whole, '\s+\S+$', ''), ''), whole);
    lname := case when whole ~ '\s' then regexp_replace(whole, '^.*\s', '') else '' end;
  end if;
  if not exists (select 1 from public.groups where id = g) then
    g := 'friends';
  end if;
  insert into public.profiles (id, email, full_name, first_name, last_name, group_id, verification_note, consented_at)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(concat_ws(' ', fname, lname)), ''),
      whole,
      split_part(new.email, '@', 1)
    ),
    fname,
    lname,
    g,
    new.raw_user_meta_data ->> 'verification_note',
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() end
  );
  return new;
end;
$$;

-- Members edit these on their own profile, including the year they joined.
grant update (
  first_name, last_name, date_of_birth, address_line1, address_line2, state, postal_code,
  job_title, retired, is_business_owner, business_name, business_website, business_phone,
  business_description, member_since
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Directory with the new fields and privacy rules.
-- ---------------------------------------------------------------------------
drop function if exists public.member_directory();

create function public.member_directory()
returns table (
  id uuid,
  full_name text,
  first_name text,
  last_name text,
  group_id text,
  role text,
  service_years text,
  bio text,
  city text,
  photo_path text,
  email text,
  phone text,
  member_since int,
  job_title text,
  retired boolean,
  is_business_owner boolean,
  business_name text,
  business_website text,
  business_phone text,
  business_description text,
  birthday text,
  date_of_birth date,
  address_line1 text,
  address_line2 text,
  state text,
  postal_code text
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
    p.first_name,
    p.last_name,
    p.group_id,
    p.role,
    p.service_years,
    p.bio,
    -- City is part of the mailing address now, so it follows the same switch.
    case when show_personal then p.city end,
    p.photo_path,
    case when show_contact then p.email end,
    case when show_contact then p.phone end,
    p.member_since,
    p.job_title,
    p.retired,
    p.is_business_owner,
    case when p.is_business_owner then p.business_name end,
    case when p.is_business_owner then p.business_website end,
    case when p.is_business_owner then p.business_phone end,
    case when p.is_business_owner then p.business_description end,
    case when show_personal then to_char(p.date_of_birth, 'FMMonth FMDD') end,
    case when is_admin_or_self then p.date_of_birth end,
    case when show_personal then p.address_line1 end,
    case when show_personal then p.address_line2 end,
    case when show_personal then p.state end,
    case when show_personal then p.postal_code end
  from public.profiles p
  cross join me
  cross join lateral (
    select
      (me.role = 'admin' or p.id = me.id) as is_admin_or_self,
      (
        me.role = 'admin'
        or p.id = me.id
        or p.contact_visibility = 'all'
        or (p.contact_visibility = 'group' and me.group_id = p.group_id)
      ) as show_personal,
      (
        me.role = 'admin'
        or p.id = me.id
        -- Branch leaders can always reach their own members by phone and email.
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

-- Branch leaders could read full profile rows for their group (including
-- address and date of birth) straight from the table. Now only the member
-- and admins can; leaders go through member_directory() like everyone else.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
