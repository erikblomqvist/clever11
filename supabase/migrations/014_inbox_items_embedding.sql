-- Dedup at capture time: store a Gemini text-embedding-004 vector per inbox item.
alter table public.inbox_items add column embedding vector(768);

create index idx_inbox_items_embedding on public.inbox_items
	using ivfflat (embedding vector_cosine_ops);

-- Ordered cosine-distance match scoped to a caller-supplied set of issue numbers.
-- The capture endpoint passes the currently-open, `needs-triage` issue numbers from GitHub,
-- since issue state isn't mirrored into the table.
create or replace function public.match_inbox_items(
	query_embedding vector(768),
	issue_numbers integer[],
	match_threshold float,
	match_count int
) returns table (
	issue_number integer,
	similarity float
)
language sql
stable
security definer
set search_path = public
as $$
	select
		i.issue_number,
		1 - (i.embedding <=> query_embedding) as similarity
	from public.inbox_items i
	where i.embedding is not null
		and i.issue_number = any(issue_numbers)
		and 1 - (i.embedding <=> query_embedding) > match_threshold
	order by i.embedding <=> query_embedding
	limit match_count;
$$;
