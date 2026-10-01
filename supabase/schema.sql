-- English Island – cloud sync table.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.

create table if not exists public.family_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Each parent account can read and write only its own row.
alter table public.family_data enable row level security;

drop policy if exists "own row: select" on public.family_data;
drop policy if exists "own row: insert" on public.family_data;
drop policy if exists "own row: update" on public.family_data;
drop policy if exists "own row: delete" on public.family_data;

create policy "own row: select" on public.family_data for select using (auth.uid() = user_id);
create policy "own row: insert" on public.family_data for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.family_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row: delete" on public.family_data for delete using (auth.uid() = user_id);
