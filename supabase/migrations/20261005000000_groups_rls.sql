-- The groups table was the one table without row-level security, which left
-- it writable through the public API. Members may read it; nobody may change
-- it except through the SQL editor. Safe to run more than once.
alter table public.groups enable row level security;

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (true);
