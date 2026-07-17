-- RLS policies restrict which rows authenticated users can access, but PostgreSQL
-- table privileges must also allow each operation before those policies run.
grant select on table
  public.profiles,
  public.journals,
  public.journal_members,
  public.days,
  public.entries,
  public.entry_revisions
to authenticated;

grant update on table public.profiles to authenticated;
grant insert, update on table public.days to authenticated;
grant insert, update on table public.entries to authenticated;
grant insert on table public.entry_revisions to authenticated;
