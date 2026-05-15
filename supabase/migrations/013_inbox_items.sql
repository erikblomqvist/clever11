-- Idea inbox: enrichment storage keyed by GitHub issue number.
-- The embedding column is added in a later migration once embedding is wired up.
create extension if not exists vector;

create table public.inbox_items (
	issue_number integer primary key,
	user_id uuid not null references auth.users (id) on delete cascade,
	snooze_until date,
	follow_up_question text,
	follow_up_answered boolean not null default false,
	area text[],
	created_at timestamptz not null default now()
);

create index idx_inbox_items_user_id on public.inbox_items (user_id);

alter table public.inbox_items enable row level security;

create policy "inbox_items_select_owner"
	on public.inbox_items for select
	using (user_id = auth.uid());
