create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (length(username) between 3 and 24),
  email text,
  elo integer not null default 1000 check (elo >= 0),
  match_count integer not null default 0 check (match_count >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  placement_count integer not null default 0 check (placement_count between 0 and 5),
  category_preferences text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references public.profiles(id),
  player2_id uuid not null references public.profiles(id),
  player1_score integer not null default 0,
  player2_score integer not null default 0,
  winner_id uuid references public.profiles(id),
  is_draw boolean not null default false,
  difficulty integer not null,
  status text not null check (status in ('completed', 'forfeit', 'cancelled')),
  elo_delta jsonb not null default '{}',
  modifier_breakdown jsonb not null default '[]',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.question_cache (
  id uuid primary key default gen_random_uuid(),
  qbreader_id text unique not null,
  text text not null,
  answer text not null,
  power_mark_index integer not null,
  difficulty integer not null,
  category text not null,
  source_metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.tossup_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  tossup_id text not null,
  tossup_order integer not null,
  player_id uuid references public.profiles(id),
  outcome text not null check (outcome in ('power', 'correct', 'neg', 'miss')),
  buzz_word_index integer,
  points integer not null,
  was_power boolean not null default false,
  answer_given text,
  created_at timestamptz not null default now()
);

create table if not exists public.rating_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  rating_before integer not null,
  rating_after integer not null,
  delta integer not null,
  expected_score numeric(6, 4) not null,
  actual_score numeric(2, 1) not null,
  k_factor integer not null,
  modifiers text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists profiles_elo_idx on public.profiles (elo desc);
create index if not exists matches_player1_idx on public.matches (player1_id, created_at desc);
create index if not exists matches_player2_idx on public.matches (player2_id, created_at desc);
create index if not exists matches_winner_idx on public.matches (winner_id);
create index if not exists tossup_results_match_idx on public.tossup_results (match_id, tossup_order);
create index if not exists tossup_results_player_idx on public.tossup_results (player_id);
create index if not exists rating_events_match_idx on public.rating_events (match_id);
create index if not exists rating_events_player_idx on public.rating_events (player_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'preferred_username', split_part(new.email, '@', 1), 'player'), '[^a-zA-Z0-9_]', '', 'g'));
  base_username := left(coalesce(nullif(base_username, ''), 'player'), 24);
  if length(base_username) < 3 then
    base_username := 'player';
  end if;

  candidate := left(base_username, 24);
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base_username, greatest(3, 24 - length(suffix::text) - 1)) || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, username, email)
  values (new.id, candidate, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.tossup_results enable row level security;
alter table public.question_cache enable row level security;
alter table public.rating_events enable row level security;

grant select on public.profiles to anon, authenticated;
grant insert (id, username, email, category_preferences) on public.profiles to authenticated;
grant update (username, category_preferences, updated_at) on public.profiles to authenticated;
grant select on public.matches to authenticated;
grant select on public.tossup_results to authenticated;
grant select on public.rating_events to authenticated;
grant select on public.question_cache to authenticated;

create policy "profiles are public readable" on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "users edit own profile" on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "users insert own profile" on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "participants read matches" on public.matches
  for select
  to authenticated
  using ((select auth.uid()) = player1_id or (select auth.uid()) = player2_id);

create policy "participants read tossup results" on public.tossup_results
  for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = tossup_results.match_id
        and ((select auth.uid()) = m.player1_id or (select auth.uid()) = m.player2_id)
    )
  );

create policy "participants read rating events" on public.rating_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = rating_events.match_id
        and ((select auth.uid()) = m.player1_id or (select auth.uid()) = m.player2_id)
    )
  );

create policy "cached questions readable to authenticated users" on public.question_cache
  for select
  to authenticated
  using (true);
