-- The Support Members page: every member-owned business, shown to all
-- approved members along with the owner's name and branch. Entering
-- business details on your profile is what lists you here.

create or replace function public.member_businesses()
returns table (
  owner_id uuid,
  owner_name text,
  group_id text,
  business_name text,
  business_website text,
  business_phone text,
  business_description text
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name, p.group_id,
         p.business_name, p.business_website, p.business_phone, p.business_description
  from public.profiles p
  where public.is_approved()
    and p.status = 'approved'
    and p.is_business_owner
    and nullif(trim(p.business_name), '') is not null
  order by lower(p.business_name)
$$;

revoke execute on function public.member_businesses() from anon, public;
grant execute on function public.member_businesses() to authenticated;
