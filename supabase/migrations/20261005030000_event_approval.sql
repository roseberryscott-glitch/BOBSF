-- Members can suggest events. A suggestion stays pending (seen only by the
-- member who sent it and by admins) until an admin approves it. Events from
-- admins, and from branch leaders for their own branch, go straight on the
-- calendar as before.

alter table public.events
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'declined')),
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists decline_reason text;

create index if not exists events_pending_idx on public.events (created_at) where status = 'pending';

-- Can this member put an event straight on the calendar?
create or replace function public.can_publish_event(g text)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_admin() or (g is not null and public.is_leader_of(g)) $$;

-- The status is decided here, not by what the browser sends.
create or replace function public.guard_event_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Server-side jobs (no signed-in user) are trusted.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := case when public.can_publish_event(new.group_id) then 'approved' else 'pending' end;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.decline_reason := null;
  elsif not public.is_admin() then
    -- Only admins approve or decline.
    new.status := old.status;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.decline_reason := old.decline_reason;
  elsif new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists events_guard_status on public.events;
create trigger events_guard_status before insert or update on public.events
  for each row execute function public.guard_event_status();

-- Who sees what:
--   approved events: everyone in the event's group (or all members)
--   pending/declined: the member who suggested it, and admins
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (
    public.is_admin()
    or (status = 'approved' and public.can_see_event_group(group_id))
    or (created_by = auth.uid() and public.is_approved())
  );

-- Any approved member can suggest an event for everyone or for their own
-- branch; the trigger above marks it pending unless they can publish.
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_approved()
    and (public.can_publish_event(group_id) or group_id is null or group_id = public.my_group())
  );

-- Members can withdraw their own suggestion while it is still waiting.
drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete to authenticated
  using (
    public.can_publish_event(group_id)
    or (created_by = auth.uid() and status = 'pending')
  );

-- RSVPs only on events that are on the calendar.
drop policy if exists rsvps_insert on public.event_rsvps;
create policy rsvps_insert on public.event_rsvps for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'approved')
  );
