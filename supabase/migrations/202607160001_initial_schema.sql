create type public.person_key as enum ('tali', 'alex');

create table public.approved_emails (
  email text primary key check (email = lower(email)),
  person_key public.person_key not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  person_key public.person_key not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.journal_members (
  journal_id uuid not null references public.journals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_key public.person_key not null,
  created_at timestamptz not null default now(),
  primary key (journal_id, user_id),
  unique (journal_id, person_key),
  unique (user_id, person_key)
);

create table public.days (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  entry_date date not null,
  starred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journal_id, entry_date)
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_id, author_user_id)
);

create table public.entry_revisions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  previous_body text not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references auth.users(id) on delete cascade
);

create function public.is_email_approved(candidate_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.approved_emails ae where ae.email = lower(candidate_email));
$$;

create function public.is_journal_member(target_journal_id uuid, target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.journal_members jm where jm.journal_id = target_journal_id and jm.user_id = target_user_id);
$$;

create function public.day_journal_id(target_day_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select d.journal_id from public.days d where d.id = target_day_id;
$$;

create function public.entry_journal_id(target_entry_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select d.journal_id from public.entries e join public.days d on d.id = e.day_id where e.id = target_entry_id;
$$;

alter table public.approved_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.journals enable row level security;
alter table public.journal_members enable row level security;
alter table public.days enable row level security;
alter table public.entries enable row level security;
alter table public.entry_revisions enable row level security;

create policy "approved users can read own allowlist row" on public.approved_emails for select to authenticated using (email = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "profiles are readable by same journal members" on public.profiles for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.journal_members self join public.journal_members other_member on other_member.journal_id = self.journal_id where self.user_id = auth.uid() and other_member.user_id = profiles.user_id));
create policy "users update only own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read journals" on public.journals for select to authenticated using (public.is_journal_member(id));
create policy "members read memberships" on public.journal_members for select to authenticated using (public.is_journal_member(journal_id));
create policy "members read days" on public.days for select to authenticated using (public.is_journal_member(journal_id));
create policy "members star days" on public.days for update to authenticated using (public.is_journal_member(journal_id)) with check (public.is_journal_member(journal_id));
create policy "members create days" on public.days for insert to authenticated with check (public.is_journal_member(journal_id));

create policy "members read entries" on public.entries for select to authenticated using (public.is_journal_member(public.day_journal_id(day_id)));
create policy "authors create own entries" on public.entries for insert to authenticated with check (author_user_id = auth.uid() and public.is_journal_member(public.day_journal_id(day_id)));
create policy "authors update own entries" on public.entries for update to authenticated using (author_user_id = auth.uid() and public.is_journal_member(public.day_journal_id(day_id))) with check (author_user_id = auth.uid() and public.is_journal_member(public.day_journal_id(day_id)));

create policy "members read entry revisions" on public.entry_revisions for select to authenticated using (public.is_journal_member(public.entry_journal_id(entry_id)));
create policy "authors create own entry revisions" on public.entry_revisions for insert to authenticated with check (created_by_user_id = auth.uid() and public.is_journal_member(public.entry_journal_id(entry_id)));
