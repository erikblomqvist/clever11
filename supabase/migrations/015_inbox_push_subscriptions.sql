-- Web Push subscriptions for the inbox daily nudge.
create table public.inbox_push_subscriptions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	endpoint text unique not null,
	p256dh text not null,
	auth text not null,
	user_agent text,
	created_at timestamptz not null default now()
);

create index idx_inbox_push_subscriptions_user_id
	on public.inbox_push_subscriptions (user_id);

alter table public.inbox_push_subscriptions enable row level security;

create policy "inbox_push_subscriptions_select_owner"
	on public.inbox_push_subscriptions for select
	using (user_id = auth.uid());
