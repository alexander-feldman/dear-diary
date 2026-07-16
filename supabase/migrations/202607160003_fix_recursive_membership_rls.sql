-- Keep membership lookups outside journal_members RLS evaluation. The function
-- owner (postgres) owns the application tables and therefore bypasses RLS.
alter function public.is_journal_member(uuid, uuid) rename to is_journal_member_legacy;

create function public.is_journal_member(target_journal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.journal_members as membership
    where membership.journal_id = target_journal_id
      and membership.user_id = auth.uid()
  );
$$;

alter function public.is_journal_member(uuid) owner to postgres;
revoke all on function public.is_journal_member(uuid) from public;
grant execute on function public.is_journal_member(uuid) to authenticated;

-- Recreate every dependent policy so its one-argument call binds to the safe
-- function above rather than the legacy function with a default second argument.
drop policy "members read journals" on public.journals;
create policy "members read journals" on public.journals
  for select to authenticated using (public.is_journal_member(id));
drop policy "members read memberships" on public.journal_members;
create policy "members read memberships" on public.journal_members
  for select to authenticated using (public.is_journal_member(journal_id));
drop policy "members read days" on public.days;
create policy "members read days" on public.days
  for select to authenticated using (public.is_journal_member(journal_id));
drop policy "members star days" on public.days;
create policy "members star days" on public.days
  for update to authenticated
  using (public.is_journal_member(journal_id))
  with check (public.is_journal_member(journal_id));
drop policy "members create days" on public.days;
create policy "members create days" on public.days
  for insert to authenticated with check (public.is_journal_member(journal_id));
drop policy "members read entries" on public.entries;
create policy "members read entries" on public.entries
  for select to authenticated using (public.is_journal_member(public.day_journal_id(day_id)));
drop policy "authors create own entries" on public.entries;
create policy "authors create own entries" on public.entries
  for insert to authenticated
  with check (author_user_id = auth.uid() and public.is_journal_member(public.day_journal_id(day_id)));
drop policy "authors update own entries" on public.entries;
create policy "authors update own entries" on public.entries
  for update to authenticated
  using (author_user_id = auth.uid() and public.is_journal_member(public.day_journal_id(day_id)))
  with check (author_user_id = auth.uid() and public.is_journal_member(public.day_journal_id(day_id)));
drop policy "members read entry revisions" on public.entry_revisions;
create policy "members read entry revisions" on public.entry_revisions
  for select to authenticated using (public.is_journal_member(public.entry_journal_id(entry_id)));
drop policy "authors create own entry revisions" on public.entry_revisions;
create policy "authors create own entry revisions" on public.entry_revisions
  for insert to authenticated
  with check (created_by_user_id = auth.uid() and public.is_journal_member(public.entry_journal_id(entry_id)));

drop function public.is_journal_member_legacy(uuid, uuid);

-- Profile visibility also uses a definer-owned membership lookup, avoiding a
-- journal_members self-join while that table's SELECT policy is being applied.
create function public.can_read_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.journal_members as target_membership
      where target_membership.user_id = target_user_id
        and public.is_journal_member(target_membership.journal_id)
    );
$$;

alter function public.can_read_profile(uuid) owner to postgres;
revoke all on function public.can_read_profile(uuid) from public;
grant execute on function public.can_read_profile(uuid) to authenticated;

drop policy "profiles are readable by same journal members" on public.profiles;
create policy "profiles are readable by same journal members" on public.profiles
  for select to authenticated using (public.can_read_profile(user_id));
