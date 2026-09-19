-- First Like — database schema
-- Paste this whole file into the Supabase dashboard -> SQL Editor -> New query -> Run.
-- It creates one row per subscriber and locks it down so each person can
-- only ever read and write their own data.

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  handle       text,
  niche        text,
  state        jsonb not null default '{}'::jsonb,   -- checklist + streak
  follows      jsonb not null default '{}'::jsonb,   -- date -> follower count
  is_paid      boolean not null default false,       -- flipped true by Stripe (Stage 2)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each subscriber sees and edits only their own row.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create a blank profile the moment someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
