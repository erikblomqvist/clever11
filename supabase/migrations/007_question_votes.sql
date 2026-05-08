-- Per-round group votes on question quality (thumbs up / thumbs down)

create table public.question_votes (
	id uuid primary key default gen_random_uuid(),
	question_id uuid not null references public.questions (id) on delete cascade,
	game_id uuid not null references public.games (id) on delete cascade,
	round_id uuid not null references public.game_rounds (id) on delete cascade unique,
	vote boolean not null, -- true = thumbs up, false = thumbs down
	created_at timestamptz not null default now()
);

create index idx_question_votes_question_id on public.question_votes (question_id);

-- RLS: fully public (matches games, game_players, game_rounds, player_answers)

alter table public.question_votes enable row level security;

create policy "question_votes_select" on public.question_votes for select using (true);
create policy "question_votes_insert" on public.question_votes for insert with check (true);
create policy "question_votes_update" on public.question_votes for update using (true);
