-- Events can repeat: every week, every other week, or every month on the
-- same date, optionally until a last date. Times stay the same local time
-- (e.g. Fridays at 7 PM) across daylight-saving changes; the website works
-- out each date.

alter table public.events
  add column if not exists repeat text not null default 'none'
    check (repeat in ('none', 'weekly', 'biweekly', 'monthly')),
  add column if not exists repeat_until date;
