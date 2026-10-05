-- Date of birth is no longer collected. Remove it, and any dates already
-- saved, so the site holds less personal information.

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
    case when show_personal then p.address_line1 end,
    case when show_personal then p.address_line2 end,
    case when show_personal then p.state end,
    case when show_personal then p.postal_code end
  from public.profiles p
  cross join me
  cross join lateral (
    select
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

alter table public.profiles drop column if exists date_of_birth;
