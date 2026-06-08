create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (length(username) between 3 and 24),
  email text,
  elo integer not null default 1000 check (elo >= 0),
  match_count integer not null default 0 check (match_count >= 0),
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
create index if not exists tossup_results_match_idx on public.tossup_results (match_id, tossup_order);
create index if not exists rating_events_player_idx on public.rating_events (player_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.tossup_results enable row level security;
alter table public.question_cache enable row level security;
alter table public.rating_events enable row level security;

create policy "profiles are public readable" on public.profiles for select using (true);
create policy "users edit own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "participants read matches" on public.matches
  for select using (auth.uid() = player1_id or auth.uid() = player2_id);

create policy "participants read tossup results" on public.tossup_results
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = tossup_results.match_id
        and (auth.uid() = m.player1_id or auth.uid() = m.player2_id)
    )
  );

create policy "participants read rating events" on public.rating_events
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = rating_events.match_id
        and (auth.uid() = m.player1_id or auth.uid() = m.player2_id)
    )
  );

create policy "cached questions readable to authenticated users" on public.question_cache
  for select using (auth.role() = 'authenticated');
