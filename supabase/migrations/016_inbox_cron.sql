-- Daily inbox nudge: cache commit embeddings and record possibly-shipped matches.

create table public.inbox_commit_embeddings (
	sha text primary key,
	message text not null,
	embedding vector(768),
	created_at timestamptz not null default now()
);

alter table public.inbox_commit_embeddings enable row level security;

alter table public.inbox_items add column possibly_shipped_sha text;

-- For each inbox item, return the single best-matching commit (highest cosine
-- similarity) when that similarity is greater than `match_threshold`.
create or replace function public.match_inbox_to_commits(
	issue_numbers integer[],
	match_threshold float
) returns table (
	issue_number integer,
	sha text,
	similarity float
)
language sql
stable
security definer
set search_path = public
as $$
	select issue_number, sha, similarity
	from (
		select
			i.issue_number,
			c.sha,
			1 - (i.embedding <=> c.embedding) as similarity,
			row_number() over (
				partition by i.issue_number
				order by i.embedding <=> c.embedding
			) as rn
		from public.inbox_items i
		join public.inbox_commit_embeddings c on c.embedding is not null
		where i.embedding is not null
			and i.issue_number = any(issue_numbers)
	) ranked
	where rn = 1 and similarity > match_threshold;
$$;
